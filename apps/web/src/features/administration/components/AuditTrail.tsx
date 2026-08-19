'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AuditEntry } from '@campus-connect/contracts';
import { EmptyState, Spinner } from '@campus-connect/ui';
import { ErrorState } from '@/components/feedback';
import { DataTable, TwoLine } from '@/components/tables/DataTable';
import { Tag } from '@/components/ui/primitives';
import { api, messageFrom, query } from '@/lib/api';
import { relativeTime, shortDate } from '@/lib/utilities/format';
import type { ListResponse } from '@/types';

const TONE: Record<string, string> = { ARCHIVE: 'tag-warn', DELETE: 'tag-bad', REJECT: 'tag-bad', APPROVE: 'tag-ok', PAYMENT: 'tag-ok', RESTORE: 'tag-ok' };

/**
 * Read-only view of the audit trail: who changed what, from where, and when.
 * Entries are written by the API inside the same request as the change.
 */
export const AuditTrail = () => {
  const [data, setData] = useState<ListResponse<AuditEntry> | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api<ListResponse<AuditEntry>>(`/api/audit${query({ page, pageSize: 25 })}`));
      setError('');
    } catch (e) {
      setError(messageFrom(e, 'Could not load the audit trail.'));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (loading && !data) return <Spinner label="Loading the audit trail…" />;
  if (!data || data.items.length === 0) return <EmptyState title="Nothing recorded yet" body="Entries appear here as soon as records are created, changed, archived or approved." />;

  return (
    <DataTable
      title="Audit trail"
      sub={`${data.meta.total} entries · page ${data.meta.page} of ${data.meta.pageCount}`}
      columns={[{ label: 'When' }, { label: 'Who' }, { label: 'Action' }, { label: 'Record' }, { label: 'Source' }]}
      rows={data.items.map((entry) => ({
        key: entry.id,
        cells: [
          <TwoLine key="w" top={relativeTime(entry.createdAt)} bottom={shortDate(entry.createdAt)} />,
          entry.userName ?? 'System',
          <Tag key="a" kind={TONE[entry.action] ?? 'tag-accent'}>
            {entry.action}
          </Tag>,
          <TwoLine key="r" top={`${entry.module} · ${entry.entityType}`} bottom={entry.entityId ? entry.entityId.slice(-10) : '—'} />,
          entry.ipAddress ?? '—',
        ],
      }))}
      controls={
        <span style={{ display: 'flex', gap: 6 }}>
          <button type="button" className="btn btn-secondary" style={{ fontSize: 12 }} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <button type="button" className="btn btn-secondary" style={{ fontSize: 12 }} disabled={page >= data.meta.pageCount} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </span>
      }
      note="Create, update, archive, approval, payment, marks and attendance actions are all recorded, with the acting account and originating address."
    />
  );
};
