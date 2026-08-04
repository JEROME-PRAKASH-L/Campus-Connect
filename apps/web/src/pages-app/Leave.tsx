'use client';

import { useEffect, useState } from 'react';
import { api, del, post } from '@/lib/api';
import { ICONS } from '@/lib/icons';
import { shortDate, titleCase } from '@/lib/format';
import { useShell } from '@/components/AppShell';
import { PageHeader, PageState } from '@/components/PageHeader';
import { Chips, KpiCards, Tag } from '@/components/primitives';
import { CardGrid } from '@/components/blocks';
import { DataTable, TwoLine } from '@/components/DataTable';

type LeaveRequest = {
  id: string;
  type: 'CASUAL' | 'MEDICAL' | 'ON_DUTY';
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  student: string;
  registerNumber: string;
  decidedBy: string | null;
};

type Data = { scope: 'student' | 'staff'; requests: LeaveRequest[] };

const STATUS_FILTERS = ['Pending', 'Approved', 'Rejected', 'All'];

export const Leave = () => {
  const { user, toast, openModal, closeModal, refreshNotifications } = useShell();
  const [data, setData] = useState<Data | null>(null);
  const [filter, setFilter] = useState('Pending');
  const [error, setError] = useState('');

  const load = () =>
    api<Data>('/api/leave')
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load leave requests.'));

  useEffect(() => {
    void load();
  }, []);

  if (error) return <PageState>{error}</PageState>;
  if (!data) return <PageState>Loading leave…</PageState>;

  const counts = {
    pending: data.requests.filter((r) => r.status === 'PENDING').length,
    approved: data.requests.filter((r) => r.status === 'APPROVED').length,
    rejected: data.requests.filter((r) => r.status === 'REJECTED').length,
  };

  if (data.scope === 'staff') {
    const visible = data.requests.filter((r) => filter === 'All' || r.status === filter.toUpperCase());
    const decide = async (request: LeaveRequest, verdict: 'APPROVED' | 'REJECTED') => {
      await post(`/api/leave/${request.id}/decide`, { verdict });
      toast(`${request.student} · leave ${verdict.toLowerCase()}.`);
      await load();
      await refreshNotifications();
    };

    return (
      <>
        <PageHeader
          kicker="Approvals"
          title="Leave requests"
          sub="Requests from your sections. Approved on-duty days still count towards attendance."
          actions={[]}
        />
        <KpiCards
          kpis={[
            { label: 'Pending', value: String(counts.pending), sub: 'Awaiting decision', icon: ICONS.file, tone: counts.pending ? 'var(--status-warn)' : 'var(--status-ok)', bar: '40%' },
            { label: 'Approved', value: String(counts.approved), sub: 'This semester', icon: ICONS.att, tone: 'var(--status-ok)', bar: '80%' },
            { label: 'Rejected', value: String(counts.rejected), sub: 'Insufficient grounds', icon: ICONS.chart, tone: 'var(--status-bad)', bar: '10%' },
            { label: 'Total', value: String(data.requests.length), sub: 'Requests on record', icon: ICONS.clock, tone: 'var(--color-accent)', bar: '92%' },
          ]}
        />
        <DataTable
          title="Request queue"
          sub="Current semester"
          controls={<Chips options={STATUS_FILTERS} value={filter} onChange={setFilter} />}
          columns={[{ label: 'Student' }, { label: 'Type' }, { label: 'Dates' }, { label: 'Days', align: 'right' }, { label: 'Reason' }, { label: '', align: 'right', width: '190px' }]}
          rows={visible.map((r) => ({
            key: r.id,
            cells: [
              <TwoLine key="n" top={r.student} bottom={r.registerNumber} />,
              <Tag key="t" kind={r.type === 'ON_DUTY' ? 'tag-accent' : 'tag-neutral'}>
                {titleCase(r.type)}
              </Tag>,
              r.days > 1 ? `${shortDate(r.fromDate)} → ${shortDate(r.toDate)}` : shortDate(r.fromDate),
              `${r.days} ${r.days > 1 ? 'days' : 'day'}`,
              <span key="r" style={{ fontSize: 13 }}>
                {r.reason}
              </span>,
              r.status === 'PENDING' ? (
                <span key="a" style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-primary" style={{ fontSize: 11.5, padding: '3px 9px' }} onClick={() => void decide(r, 'APPROVED')}>
                    Approve
                  </button>
                  <button type="button" className="btn btn-secondary" style={{ fontSize: 11.5, padding: '3px 9px' }} onClick={() => void decide(r, 'REJECTED')}>
                    Reject
                  </button>
                </span>
              ) : (
                <Tag key="s" kind={r.status === 'APPROVED' ? 'tag-accent' : 'tag-neutral'}>
                  {titleCase(r.status)}
                </Tag>
              ),
            ],
          }))}
          note="Medical leave beyond three days needs a certificate countersigned by the institute medical officer."
          emptyLabel={`No ${filter.toLowerCase()} requests.`}
        />
      </>
    );
  }

  const apply = () =>
    openModal({
      kicker: 'New request',
      title: 'Apply for leave',
      sub: 'Routed to your class advisor, then to the HOD if longer than three days.',
      fields: [
        { key: 'type', label: 'Type', kind: 'select', options: [{ value: 'CASUAL', label: 'Casual' }, { value: 'MEDICAL', label: 'Medical' }, { value: 'ON_DUTY', label: 'On duty' }] },
        { key: 'fromDate', label: 'From', kind: 'date', value: new Date().toISOString().slice(0, 10) },
        { key: 'toDate', label: 'To', kind: 'date', value: new Date().toISOString().slice(0, 10) },
        { key: 'reason', label: 'Reason', kind: 'area', placeholder: 'Give enough detail for the advisor to decide', span: 2 },
      ],
      note: 'On-duty leave for approved events counts towards attendance.',
      confirmLabel: 'Submit request',
      onConfirm: async (form) => {
        await post('/api/leave', { type: form.type, fromDate: form.fromDate, toDate: form.toDate, reason: form.reason });
        closeModal();
        toast('Leave request submitted to your class advisor.');
        await load();
      },
    });

  const withdraw = async (request: LeaveRequest) => {
    await del(`/api/leave/${request.id}`);
    toast('Leave request withdrawn.');
    await load();
  };

  return (
    <>
      <PageHeader
        kicker="Leave & on duty"
        title="Leave"
        sub="Apply for casual, medical or on-duty leave and track the decision."
        actions={user.role === 'STUDENT' ? [{ label: 'Apply for leave', icon: ICONS.plus, onClick: apply, primary: true }] : []}
      />
      <KpiCards
        kpis={[
          { label: 'Applied', value: String(data.requests.length), sub: 'This semester', icon: ICONS.file, tone: 'var(--color-accent)', bar: '30%' },
          { label: 'Approved', value: String(counts.approved), sub: 'Counted where on duty', icon: ICONS.att, tone: 'var(--status-ok)', bar: '66%' },
          { label: 'Pending', value: String(counts.pending), sub: 'With the class advisor', icon: ICONS.clock, tone: counts.pending ? 'var(--status-warn)' : 'var(--status-ok)', bar: '33%' },
          { label: 'Rejected', value: String(counts.rejected), sub: 'Not granted', icon: ICONS.chart, tone: counts.rejected ? 'var(--status-bad)' : 'var(--status-ok)', bar: '15%' },
        ]}
      />
      <CardGrid>
        {data.requests.map((r) => (
          <div key={r.id} className="card anim-fade-up" style={{ padding: 20, paddingTop: 22, gap: 'var(--space-2)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
              <span className="card-kicker">{titleCase(r.type)} leave</span>
              <Tag kind={r.status === 'APPROVED' ? 'tag-accent' : 'tag-neutral'}>{titleCase(r.status)}</Tag>
            </div>
            <div className="card-title">{r.days > 1 ? `${shortDate(r.fromDate)} → ${shortDate(r.toDate)}` : shortDate(r.fromDate)}</div>
            <p className="card-body">{r.reason}</p>
            <div className="card-meta" style={{ justifyContent: 'space-between', borderTop: '1px solid var(--color-divider)', paddingTop: 9, marginTop: 3, gap: 8, flexWrap: 'wrap' }}>
              <span>{r.status === 'PENDING' ? 'Awaiting class advisor' : `Decided by ${r.decidedBy ?? '—'}`}</span>
              {r.status === 'PENDING' && user.role === 'STUDENT' ? (
                <button type="button" className="btn btn-secondary" style={{ fontSize: 11.5, padding: '4px 10px' }} onClick={() => void withdraw(r)}>
                  Withdraw
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </CardGrid>
    </>
  );
};
