'use client';

import { useEffect, useState } from 'react';
import { api, post } from '@/lib/api';
import { ICONS } from '@/lib/icons';
import { money, shortDate } from '@/lib/format';
import { useShell } from '@/components/AppShell';
import { PageHeader, PageState } from '@/components/PageHeader';
import { Bar, KpiCards, Tag } from '@/components/primitives';
import { DataTable, Figure, TwoLine } from '@/components/DataTable';

type StudentFees = {
  scope: 'student';
  student: { name: string; registerNumber: string };
  fees: { id: string; head: string; amount: number; status: 'PAID' | 'PENDING'; dueDate: string; academicYear: string; receipt: { number: string; paidOn: string; mode: string } | null }[];
  totals: { total: number; paid: number; balance: number };
};

type InstituteFees = {
  scope: 'institute';
  departments: { code: string; name: string; demand: number; collected: number; percentage: number }[];
  totals: { demand: number; collected: number; outstanding: number; percentage: number };
  defaulters: number;
};

export const Fees = () => {
  const { user, toast, openModal, closeModal, refreshNotifications } = useShell();
  const [data, setData] = useState<StudentFees | InstituteFees | null>(null);
  const [error, setError] = useState('');

  const load = () =>
    api<StudentFees | InstituteFees>('/api/fees')
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load the fee ledger.'));

  useEffect(() => {
    void load();
  }, []);

  if (error) return <PageState>{error}</PageState>;
  if (!data) return <PageState>Loading fees…</PageState>;

  if (data.scope === 'institute') {
    return (
      <>
        <PageHeader
          kicker="Finance"
          title="Fees management"
          sub="Collection against demand for the current academic year."
          actions={[{ label: 'Export ledger', icon: ICONS.down, onClick: () => toast('Fee ledger exported.') }]}
        />
        <KpiCards
          kpis={[
            { label: 'Demand', value: money(data.totals.demand), sub: 'Raised this year', icon: ICONS.card, tone: 'var(--color-accent)', bar: '100%' },
            { label: 'Collected', value: money(data.totals.collected), sub: `${data.totals.percentage}% of demand`, icon: ICONS.card, tone: 'var(--status-ok)', bar: `${data.totals.percentage}%` },
            { label: 'Outstanding', value: money(data.totals.outstanding), sub: `${data.defaulters} defaulters`, icon: ICONS.chart, tone: 'var(--status-bad)', bar: `${100 - data.totals.percentage}%` },
            { label: 'Departments', value: String(data.departments.length), sub: 'Reporting collection', icon: ICONS.users, tone: 'var(--color-accent)', bar: '100%' },
          ]}
        />
        <DataTable
          title="Collection by department"
          sub="Current academic year"
          columns={[{ label: 'Department' }, { label: 'Demand', align: 'right' }, { label: 'Collected', align: 'right' }, { label: 'Collection', width: '190px' }, { label: '', align: 'right', width: '170px' }]}
          rows={data.departments.map((d) => ({
            key: d.code,
            cells: [
              <TwoLine key="n" top={d.name} bottom={d.code} />,
              money(d.demand),
              money(d.collected),
              <Bar key="b" value={d.percentage} tone={d.percentage >= 85 ? 'var(--status-ok)' : 'var(--status-warn)'} />,
              <button
                key="r"
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: 11.5, padding: '3px 9px' }}
                onClick={async () => {
                  const result = await post<{ notified: number }>('/api/fees/remind', { departmentCode: d.code });
                  toast(`Fee reminder sent to ${result.notified} ${d.code} defaulters.`);
                }}
              >
                Send reminder
              </button>,
            ],
          }))}
          note="Figures update as payments settle. Reconciliation runs nightly at 02:00."
        />
      </>
    );
  }

  const canPay = user.role === 'STUDENT' || user.role === 'PARENT';

  const pay = (fee: StudentFees['fees'][number]) =>
    openModal({
      kicker: 'Secure payment',
      title: `Pay ${fee.head}`,
      sub: 'Payments settle within two working hours.',
      big: money(fee.amount),
      bigLabel: 'Amount payable',
      fields: [
        { key: 'mode', label: 'Payment method', kind: 'select', options: ['UPI', 'Net banking', 'Debit card', 'Credit card', 'NEFT / RTGS'].map((m) => ({ value: m, label: m })) },
        { key: 'referenceName', label: 'Reference name', kind: 'text', placeholder: data.student.name },
      ],
      note: `A late fee of ₹100 per day applies after ${shortDate(fee.dueDate)}.`,
      confirmLabel: `Pay ${money(fee.amount)}`,
      onConfirm: async (form) => {
        const result = await post<{ receipt: string }>(`/api/fees/${fee.id}/pay`, { mode: form.mode, referenceName: form.referenceName });
        closeModal();
        toast(`Payment successful · receipt ${result.receipt} issued.`);
        await load();
        await refreshNotifications();
      },
    });

  const receipt = (fee: StudentFees['fees'][number]) =>
    openModal({
      kicker: `Receipt ${fee.receipt?.number}`,
      title: fee.head,
      sub: 'DMI College of Engineering · Finance office',
      rows: [
        { k: 'Student', v: `${data.student.name} · ${data.student.registerNumber}` },
        { k: 'Receipt no.', v: fee.receipt?.number ?? '—' },
        { k: 'Paid on', v: fee.receipt ? shortDate(fee.receipt.paidOn) : '—' },
        { k: 'Mode', v: fee.receipt?.mode ?? '—' },
        { k: 'Status', v: 'Realised' },
      ],
      big: money(fee.amount),
      bigLabel: 'Amount paid',
      note: 'This is a computer-generated receipt and does not require a signature.',
      cancelLabel: 'Close',
      confirmLabel: 'Download PDF',
      onConfirm: () => {
        closeModal();
        toast(`Receipt ${fee.receipt?.number} downloaded.`);
      },
    });

  const { total, paid, balance } = data.totals;
  const nextDue = data.fees.find((f) => f.status === 'PENDING');

  return (
    <>
      <PageHeader
        kicker={user.role === 'PARENT' ? `Ward · ${data.student.name}` : 'Finance'}
        title="Fees"
        sub="Every head of fee for the year, with receipts against each settled payment."
        actions={[{ label: 'Fee structure', icon: ICONS.file, onClick: () => toast('Fee structure downloaded.') }]}
      />
      <KpiCards
        kpis={[
          { label: 'Total demand', value: money(total), sub: data.fees[0]?.academicYear ?? '', icon: ICONS.card, tone: 'var(--color-accent)', bar: '100%' },
          { label: 'Paid', value: money(paid), sub: `${Math.round((paid / Math.max(total, 1)) * 100)}% settled`, icon: ICONS.att, tone: 'var(--status-ok)', bar: `${(paid / Math.max(total, 1)) * 100}%` },
          { label: 'Balance', value: money(balance), sub: nextDue ? `Due ${shortDate(nextDue.dueDate)}` : 'Nothing outstanding', icon: ICONS.chart, tone: balance ? 'var(--status-bad)' : 'var(--status-ok)', bar: `${(balance / Math.max(total, 1)) * 100}%` },
          { label: 'Heads of fee', value: String(data.fees.length), sub: 'This academic year', icon: ICONS.file, tone: 'var(--color-accent)', bar: '100%' },
        ]}
      />
      <DataTable
        title="Fee ledger"
        sub={data.fees[0]?.academicYear ?? 'Current academic year'}
        columns={[{ label: 'Head of fee' }, { label: 'Amount', align: 'right' }, { label: 'Date' }, { label: 'Mode' }, { label: 'Status' }, { label: '', align: 'right', width: '130px' }]}
        rows={data.fees.map((f) => ({
          key: f.id,
          cells: [
            <TwoLine key="n" top={f.head} bottom={f.receipt?.number ?? 'Awaiting payment'} />,
            <Figure key="a">{money(f.amount)}</Figure>,
            f.receipt ? shortDate(f.receipt.paidOn) : `Due ${shortDate(f.dueDate)}`,
            f.receipt?.mode ?? '—',
            <Tag key="t" kind={f.status === 'PAID' ? 'tag-accent' : 'tag-neutral'}>
              {f.status === 'PAID' ? 'Paid' : 'Pending'}
            </Tag>,
            f.status === 'PAID' ? (
              <button key="b" type="button" className="btn btn-secondary" style={{ fontSize: 11.5, padding: '3px 9px' }} onClick={() => receipt(f)}>
                Receipt
              </button>
            ) : canPay ? (
              <button key="b" type="button" className="btn btn-primary" style={{ fontSize: 11.5, padding: '3px 9px' }} onClick={() => pay(f)}>
                Pay now
              </button>
            ) : null,
          ],
        }))}
        note={balance ? `A late fee of ₹100 per day applies after the due date.` : 'All heads of fee are settled for this academic year.'}
      />
    </>
  );
};
