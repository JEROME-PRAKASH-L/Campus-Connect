'use client';

import { useEffect, useState } from 'react';
import { api, del, post } from '@/lib/api';
import { ICONS } from '@/lib/utilities/icons';
import { shortDate } from '@/lib/utilities/format';
import { useShell } from '@/components/layout/AppShell';
import { PageHeader, PageState } from '@/components/ui/PageHeader';
import { KpiCards, Tag } from '@/components/ui/primitives';
import { CardGrid } from '@/components/ui/blocks';

type PlacementData = {
  cgpa: number;
  drives: { id: string; company: string; role: string; ctc: string; driveDate: string; eligibility: string; minCgpa: number; status: 'Registered' | 'Eligible' | 'Not eligible' }[];
};

export const Placement = () => {
  const { user, toast, openModal, closeModal } = useShell();
  const [data, setData] = useState<PlacementData | null>(null);
  const [error, setError] = useState('');

  const load = () =>
    api<PlacementData>('/api/placement')
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load placement drives.'));

  useEffect(() => {
    void load();
  }, []);

  if (error) return <PageState>{error}</PageState>;
  if (!data) return <PageState>Loading placement…</PageState>;

  const isStudent = user.role === 'STUDENT';

  const register = async (drive: PlacementData['drives'][number]) => {
    try {
      await post(`/api/placement/${drive.id}/register`);
      toast(`Registered for the ${drive.company} drive on ${shortDate(drive.driveDate)}.`);
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not register.');
    }
  };

  const withdraw = async (drive: PlacementData['drives'][number]) => {
    await del(`/api/placement/${drive.id}/register`);
    toast(`Withdrawn from the ${drive.company} drive.`);
    await load();
  };

  return (
    <>
      <PageHeader
        kicker="Training & placement cell"
        title="Placement"
        sub="Drives, eligibility and the placement record for the graduating batch."
        actions={
          isStudent
            ? [
                {
                  label: 'Upload résumé',
                  icon: ICONS.plus,
                  primary: true,
                  onClick: () =>
                    openModal({
                      kicker: 'Placement profile',
                      title: 'Upload your résumé',
                      sub: 'Shared with recruiters for drives you register for.',
                      fields: [
                        { key: 'file', label: 'Résumé', kind: 'file', value: 'Drop a PDF (max 2 MB)', span: 2 },
                        { key: 'role', label: 'Preferred role', kind: 'select', options: ['Software engineering', 'Data science', 'Systems & networks', 'Product'].map((r) => ({ value: r, label: r })) },
                      ],
                      confirmLabel: 'Upload',
                      onConfirm: () => {
                        closeModal();
                        toast('Résumé uploaded to your placement profile.');
                      },
                    }),
                },
              ]
            : []
        }
      />
      <KpiCards
        kpis={[
          { label: 'Open drives', value: String(data.drives.length), sub: 'This placement season', icon: ICONS.case, tone: 'var(--color-accent)', bar: '92%' },
          { label: 'Eligible', value: String(data.drives.filter((d) => d.status !== 'Not eligible').length), sub: isStudent ? `Your CGPA is ${data.cgpa.toFixed(2)}` : 'Against criteria', icon: ICONS.att, tone: 'var(--status-ok)', bar: '75%' },
          { label: 'Registered', value: String(data.drives.filter((d) => d.status === 'Registered').length), sub: 'Confirmed participation', icon: ICONS.chart, tone: 'var(--color-accent)', bar: '40%' },
          { label: 'Highest CTC', value: data.drives.map((d) => d.ctc).sort((a, b) => parseFloat(b.replace(/[^\d.]/g, '')) - parseFloat(a.replace(/[^\d.]/g, '')))[0] ?? '—', sub: 'Across listed drives', icon: ICONS.cap, tone: 'var(--color-accent)', bar: '100%' },
        ]}
      />
      <CardGrid>
        {data.drives.map((d) => (
          <div key={d.id} className="card anim-fade-up" style={{ padding: 20, paddingTop: 22, gap: 'var(--space-2)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
              <span className="card-kicker">{shortDate(d.driveDate)}</span>
              <Tag kind={d.status === 'Not eligible' ? 'tag-neutral' : 'tag-accent'}>{d.status}</Tag>
            </div>
            <div className="card-title">{d.company}</div>
            <p className="card-body">
              {d.role} · {d.ctc}. {d.eligibility}.
            </p>
            <div className="card-meta" style={{ justifyContent: 'space-between', borderTop: '1px solid var(--color-divider)', paddingTop: 9, marginTop: 3, gap: 8, flexWrap: 'wrap' }}>
              <span>Campus drive</span>
              {isStudent ? (
                d.status === 'Not eligible' ? (
                  <button type="button" className="btn btn-secondary" style={{ fontSize: 11.5, padding: '4px 10px' }} onClick={() => toast(`You need a CGPA of ${d.minCgpa} for ${d.company}. Yours is ${data.cgpa.toFixed(2)}.`)}>
                    Criteria
                  </button>
                ) : d.status === 'Registered' ? (
                  <button type="button" className="btn btn-secondary" style={{ fontSize: 11.5, padding: '4px 10px' }} onClick={() => void withdraw(d)}>
                    Withdraw
                  </button>
                ) : (
                  <button type="button" className="btn btn-primary" style={{ fontSize: 11.5, padding: '4px 10px' }} onClick={() => void register(d)}>
                    Register
                  </button>
                )
              ) : null}
            </div>
          </div>
        ))}
      </CardGrid>
    </>
  );
};
