'use client';

import { useCallback, useEffect, useState } from 'react';
import { supportRequestCreateSchema, supportRequestResolveSchema } from '@campus-connect/contracts';
import { EmptyState, Spinner, SuccessBanner } from '@campus-connect/ui';
import { ErrorState } from '@/components/feedback';
import { ResourceForm, type FieldSpec } from '@/components/forms/ResourceForm';
import { DataTable, TwoLine } from '@/components/tables/DataTable';
import { Section, SectionHead, Tag } from '@/components/ui/primitives';
import { api, messageFrom, post } from '@/lib/api';
import { relativeTime } from '@/lib/utilities/format';
import { useShell } from '@/components/layout/AppShell';
import { can } from '@/config/permissions';

type SupportRequest = {
  id: string;
  kind: string;
  subject: string;
  body: string;
  status: 'OPEN' | 'RESOLVED' | 'REJECTED';
  resolution: string;
  raisedBy: string;
  raisedByRole: string;
  resolvedBy: string | null;
  createdAt: string;
};

const KIND_OPTIONS = [
  { value: 'SUPPORT', label: 'Support request' },
  { value: 'CONTACT_UPDATE', label: 'Contact-information update' },
  { value: 'ACKNOWLEDGEMENT', label: 'Acknowledgement' },
  { value: 'RECORD_CORRECTION', label: 'Record correction' },
];

const RAISE_FIELDS: FieldSpec[] = [
  { key: 'kind', label: 'Type', kind: 'select', required: true, options: KIND_OPTIONS },
  { key: 'subject', label: 'Subject', kind: 'text', required: true, span: 2 },
  { key: 'body', label: 'Message', kind: 'textarea', required: true, span: 2 },
];

const TONE: Record<string, string> = { OPEN: 'tag-warn', RESOLVED: 'tag-ok', REJECTED: 'tag-bad' };

/**
 * Support tickets, contact-update requests and parent acknowledgements. Students
 * and parents see their own; staff who may resolve see the whole queue — the API
 * decides which, from the caller's role.
 */
export const SupportRequests = () => {
  const { user, toast } = useShell();
  const [requests, setRequests] = useState<SupportRequest[] | null>(null);
  const [error, setError] = useState('');
  const [banner, setBanner] = useState('');
  const [resolving, setResolving] = useState<SupportRequest | null>(null);

  const canResolve = can(user.role, 'support:resolve');
  const canRaise = can(user.role, 'support:raise');

  const load = useCallback(async () => {
    try {
      const data = await api<{ requests: SupportRequest[] }>('/api/support');
      setRequests(data.requests);
      setError('');
    } catch (e) {
      setError(messageFrom(e, 'Could not load support requests.'));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!requests) return <Spinner label="Loading support requests…" />;

  return (
    <>
      {banner ? <SuccessBanner message={banner} onDismiss={() => setBanner('')} /> : null}

      {canRaise ? (
        <Section>
          <SectionHead title="Raise a request" meta="Goes to the department office" />
          <ResourceForm
            fields={RAISE_FIELDS}
            schema={supportRequestCreateSchema}
            submitLabel="Submit request"
            onSubmit={async (values) => {
              await post('/api/support', values);
              setBanner('Your request was submitted. You will be notified when it is answered.');
              toast('Request submitted.');
              await load();
            }}
          />
        </Section>
      ) : null}

      {requests.length === 0 ? (
        <Section>
          <EmptyState title="No requests yet" body={canResolve ? 'Requests raised by students and parents will appear here.' : 'Anything you raise will be listed here with its status.'} />
        </Section>
      ) : (
        <DataTable
          title={canResolve ? 'Support queue' : 'My requests'}
          sub={`${requests.filter((r) => r.status === 'OPEN').length} open`}
          columns={[{ label: 'Request' }, { label: 'Type' }, ...(canResolve ? [{ label: 'Raised by' }] : []), { label: 'Status' }, { label: 'When' }, { label: '', align: 'right' as const, width: '110px' }]}
          rows={requests.map((r) => ({
            key: r.id,
            cells: [
              <TwoLine key="s" top={r.subject} bottom={r.body.slice(0, 90)} />,
              KIND_OPTIONS.find((k) => k.value === r.kind)?.label ?? r.kind,
              ...(canResolve ? [<TwoLine key="b" top={r.raisedBy} bottom={r.raisedByRole} />] : []),
              <Tag key="t" kind={TONE[r.status] ?? 'tag-neutral'}>
                {r.status}
              </Tag>,
              relativeTime(r.createdAt),
              canResolve && r.status === 'OPEN' ? (
                <button key="a" type="button" className="btn btn-secondary" style={{ fontSize: 11.5, padding: '3px 9px' }} onClick={() => setResolving(r)}>
                  Respond
                </button>
              ) : (
                <span key="a" style={{ fontSize: 11.5, opacity: 0.7 }}>
                  {r.resolvedBy ?? '—'}
                </span>
              ),
            ],
          }))}
          note="Requests are answered by the department office. Nothing here changes a record directly — an approved correction is applied by the registry."
        />
      )}

      {resolving ? (
        <Section>
          <SectionHead
            title={`Respond — ${resolving.subject}`}
            meta={`${resolving.raisedBy} · ${resolving.raisedByRole}`}
            action={
              <button type="button" className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setResolving(null)}>
                Close
              </button>
            }
          />
          <p style={{ fontSize: 13.5, lineHeight: 1.55, margin: 0, color: 'var(--muted)' }}>{resolving.body}</p>
          <ResourceForm
            fields={[
              { key: 'status', label: 'Outcome', kind: 'select', required: true, options: [{ value: 'RESOLVED', label: 'Resolved' }, { value: 'REJECTED', label: 'Rejected' }] },
              { key: 'resolution', label: 'Response', kind: 'textarea', required: true, span: 2 },
            ]}
            schema={supportRequestResolveSchema}
            submitLabel="Send response"
            onCancel={() => setResolving(null)}
            onSubmit={async (values) => {
              await post(`/api/support/${resolving.id}/resolve`, values);
              setBanner('Response sent.');
              toast('Response sent.');
              setResolving(null);
              await load();
            }}
          />
        </Section>
      ) : null}
    </>
  );
};
