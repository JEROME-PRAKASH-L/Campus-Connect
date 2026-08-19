'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ICONS } from '@/lib/utilities/icons';
import { attendanceTone, shortDate } from '@/lib/utilities/format';
import { useShell } from '@/components/layout/AppShell';
import { PageHeader, PageState } from '@/components/ui/PageHeader';
import { KpiCards, Section, SectionHead, Tag } from '@/components/ui/primitives';
import { DataTable, TwoLine } from '@/components/tables/DataTable';
import { can } from '@/config/permissions';
import { SelfServicePanel } from './components/SelfServicePanel';

type ProfileData = {
  scope: 'student' | 'staff';
  name: string;
  subtitle: string;
  tags: string[];
  photoUrl: string | null;
  attendance?: number;
  cgpa?: number;
  creditsEarned?: number;
  arrears?: number;
  fields: { label: string; value: string }[];
  certificates: { id: string; title: string; reference: string; issuedOn: string | null; status: string }[];
};

export const Profile = () => {
  const { user, toast, go, openModal, closeModal } = useShell();
  const [data, setData] = useState<ProfileData | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api<ProfileData>('/api/profile')
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load your profile.'));
  }, []);

  useEffect(load, [load]);

  if (error) return <PageState>{error}</PageState>;
  if (!data) return <PageState>Loading your profile…</PageState>;

  const isStudent = data.scope === 'student';
  const fieldValue = (label: string) => data.fields.find((f) => f.label === label)?.value ?? '';

  return (
    <>
      <PageHeader
        kicker={isStudent ? 'Student record' : 'Staff record'}
        title="Profile"
        sub="Master record as held by the registry. Corrections are routed to your department office."
        actions={[
          {
            label: 'Request correction',
            icon: ICONS.file,
            onClick: () =>
              openModal({
                kicker: 'Registry',
                title: 'Request a record correction',
                sub: 'Goes to the department office for verification.',
                fields: [
                  { key: 'field', label: 'Field', kind: 'select', options: ['Mobile number', 'Residential address', 'Guardian details', 'Blood group'].map((f) => ({ value: f, label: f })) },
                  { key: 'value', label: 'Corrected value', kind: 'text', placeholder: 'New value' },
                  { key: 'reason', label: 'Reason', kind: 'area', placeholder: 'Why this change is needed', span: 2 },
                ],
                confirmLabel: 'Submit request',
                onConfirm: () => {
                  closeModal();
                  toast('Correction request sent to the department office.');
                },
              }),
          },
          { label: 'Download bonafide', icon: ICONS.down, onClick: () => toast('Bonafide certificate queued for download.'), primary: true },
        ]}
      />

      {isStudent ? (
        <KpiCards
          kpis={[
            { label: 'Attendance', value: `${data.attendance ?? 0}%`, sub: 'Cumulative', icon: ICONS.att, tone: attendanceTone(data.attendance ?? 0), bar: `${data.attendance ?? 0}%` },
            { label: 'CGPA', value: (data.cgpa ?? 0).toFixed(2), sub: `${data.creditsEarned ?? 0} credits earned`, icon: ICONS.cap, tone: 'var(--color-accent)', bar: `${(data.cgpa ?? 0) * 10}%` },
            { label: 'Credits', value: String(data.creditsEarned ?? 0), sub: 'Towards the programme', icon: ICONS.chart, tone: 'var(--color-accent)', bar: '78%' },
            { label: 'Arrears', value: String(data.arrears ?? 0), sub: data.arrears ? 'Pending papers' : 'All subjects cleared', icon: ICONS.cap, tone: data.arrears ? 'var(--status-bad)' : 'var(--status-ok)', bar: '100%' },
          ]}
        />
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(290px,1fr))', gap: 'var(--space-6)', alignItems: 'start' }}>
        <Section style={{ maxWidth: 340 }}>
          <div style={{ width: '100%', aspectRatio: '4 / 5', border: '1px solid var(--color-divider)', borderRadius: 8, display: 'grid', placeItems: 'center', background: 'var(--color-surface)', overflow: 'hidden' }}>
            {data.photoUrl ? (
              <img src={data.photoUrl} alt={data.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ display: 'grid', placeItems: 'center', gap: 8, color: 'var(--muted)' }}>
                <div style={{ width: 72, height: 72, borderRadius: 999, background: 'var(--purple)', color: '#fff', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 26 }}>
                  {data.name.split(' ').map((p) => p[0]).join('').slice(0, 2)}
                </div>
                <span style={{ fontSize: 12 }}>No portrait on record</span>
              </div>
            )}
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 24, lineHeight: 1.1 }}>{data.name}</div>
            <div style={{ fontSize: 12.5, opacity: 0.72 }}>{data.subtitle}</div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {data.tags.map((t) => (
              <Tag key={t} kind="tag-accent">
                {t}
              </Tag>
            ))}
          </div>
        </Section>

        <Section>
          <SectionHead title="Personal & academic details" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 'var(--space-3) var(--space-4)' }}>
            {data.fields.map((f) => (
              <div key={f.label} style={{ borderBottom: '1px solid var(--color-divider)', paddingBottom: 7 }}>
                <div style={{ fontSize: 11.5, letterSpacing: '.12em', textTransform: 'uppercase', opacity: 0.72 }}>{f.label}</div>
                <div style={{ fontSize: 14, marginTop: 2 }}>{f.value}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginTop: 'var(--space-2)' }}>
            <button type="button" className="btn btn-secondary" style={{ fontSize: 12.5 }} onClick={() => go('settings')}>
              Change password
            </button>
            <button type="button" className="btn btn-secondary" style={{ fontSize: 12.5 }} onClick={() => go('timetable')}>
              View timetable
            </button>
          </div>
        </Section>
      </div>

      {isStudent && can(user.role, 'student:write-own') ? (
        <SelfServicePanel
          initial={{ mobile: fieldValue('Mobile'), bloodGroup: fieldValue('Blood group'), residence: fieldValue('Residence') }}
          onSaved={load}
        />
      ) : null}

      {isStudent && data.certificates.length ? (
        <DataTable
          title="Certificates & documents"
          sub="Issued by the registry against your record"
          columns={[{ label: 'Document' }, { label: 'Issued on' }, { label: 'Status' }, { label: '', align: 'right', width: '120px' }]}
          rows={data.certificates.map((c) => ({
            key: c.id,
            cells: [
              <TwoLine key="n" top={c.title} bottom={c.reference} />,
              c.issuedOn ? shortDate(c.issuedOn) : '—',
              <Tag key="t" kind={c.status === 'Issued' ? 'tag-accent' : 'tag-neutral'}>
                {c.status}
              </Tag>,
              c.status === 'Issued' ? (
                <button key="b" type="button" className="btn btn-secondary" style={{ fontSize: 11.5, padding: '3px 9px' }} onClick={() => toast(`Downloading ${c.title}…`)}>
                  Download
                </button>
              ) : null,
            ],
          }))}
          note="Digitally signed copies carry a QR verification code valid for 12 months."
        />
      ) : null}
    </>
  );
};
