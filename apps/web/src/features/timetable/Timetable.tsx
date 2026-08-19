'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ICONS } from '@/lib/utilities/icons';
import { useShell } from '@/components/layout/AppShell';
import { PageHeader, PageState } from '@/components/ui/PageHeader';
import { KpiCards, Section, SectionHead, Select } from '@/components/ui/primitives';

type Entry = {
  dayOfWeek: number;
  period: number;
  startTime: string;
  endTime: string;
  room: string;
  label: string | null;
  section: string;
  subject: { id: string; code: string; name: string; faculty: string } | null;
};

type TimetableData = {
  periods: string[][];
  scope: 'student' | 'faculty' | 'section';
  sections: { id: string; label: string }[];
  entries: Entry[];
};

const DAYS = [
  { index: 1, label: 'Mon' },
  { index: 2, label: 'Tue' },
  { index: 3, label: 'Wed' },
  { index: 4, label: 'Thu' },
  { index: 5, label: 'Fri' },
  { index: 6, label: 'Sat' },
];

const toMinutes = (t: string) => Number(t.split(':')[0]) * 60 + Number(t.split(':')[1]);

export const Timetable = () => {
  const { user, toast } = useShell();
  const [data, setData] = useState<TimetableData | null>(null);
  const [sectionId, setSectionId] = useState('');
  const [error, setError] = useState('');

  const canFilter = user.role === 'HOD' || user.role === 'ADMIN';

  useEffect(() => {
    api<TimetableData>(`/api/timetable${sectionId ? `?sectionId=${sectionId}` : ''}`)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load the timetable.'));
  }, [sectionId]);

  if (error) return <PageState>{error}</PageState>;
  if (!data) return <PageState>Loading the timetable…</PageState>;

  const now = new Date();
  const today = now.getDay();
  const minutesNow = now.getHours() * 60 + now.getMinutes();

  const cellFor = (day: number, period: number) => data.entries.find((e) => e.dayOfWeek === day && e.period === period);
  const periodsPerWeek = data.entries.length;
  const nextClass = data.entries
    .filter((e) => e.dayOfWeek === today && toMinutes(e.startTime) > minutesNow)
    .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime))[0];

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 5);

  return (
    <>
      <PageHeader
        kicker={data.scope === 'faculty' ? 'My teaching schedule' : 'Weekly schedule'}
        title="Weekly timetable"
        sub="Monday to Saturday, seven periods a day. The class running right now is highlighted."
        actions={[
          { label: 'Print', icon: ICONS.file, onClick: () => window.print() },
          { label: 'Add to calendar', icon: ICONS.cal, onClick: () => toast('Timetable exported as an .ics calendar file.'), primary: true },
        ]}
      />

      <KpiCards
        kpis={[
          { label: 'Periods / week', value: String(periodsPerWeek), sub: 'Including laboratories', icon: ICONS.clock, tone: 'var(--color-accent)', bar: '70%' },
          { label: 'Contact hours', value: `${Math.round(periodsPerWeek * 0.83)} h`, sub: 'Theory + practical', icon: ICONS.cal, tone: 'var(--color-accent)', bar: '62%' },
          { label: 'Free periods', value: String(Math.max(0, 42 - periodsPerWeek)), sub: 'Library & mentoring', icon: ICONS.file, tone: 'var(--color-accent)', bar: '20%' },
          { label: 'Next class', value: nextClass?.subject?.code ?? '—', sub: nextClass ? `${nextClass.startTime} · ${nextClass.room}` : 'Nothing left today', icon: ICONS.cap, tone: 'var(--color-accent)', bar: '48%' },
        ]}
      />

      <Section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <SectionHead title={`Week of ${weekStart.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} – ${weekEnd.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, opacity: 0.72 }}>
              <span style={{ width: 10, height: 10, background: 'color-mix(in srgb, var(--color-accent) 25%, transparent)', border: '1px solid var(--color-accent)' }} />
              In progress
            </span>
            {canFilter && data.sections.length ? (
              <Select value={sectionId || data.sections[0].id} options={data.sections.map((s) => s.id)} onChange={setSectionId} />
            ) : null}
          </div>
        </div>

        <div style={{ overflowX: 'auto', padding: 2 }}>
          <div style={{ minWidth: 940, display: 'grid', gridTemplateColumns: '96px repeat(6,1fr)', gap: 5 }}>
            <div />
            {DAYS.map((d) => (
              <div
                key={d.index}
                style={{
                  textAlign: 'center',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 700,
                  fontSize: 14,
                  letterSpacing: '.1em',
                  textTransform: 'uppercase',
                  padding: '2px 0 5px',
                  borderBottom: `2px solid ${d.index === today ? 'var(--color-accent)' : 'var(--color-divider)'}`,
                  color: d.index === today ? 'var(--color-accent-700)' : 'var(--color-text)',
                }}
              >
                {d.label}
              </div>
            ))}

            {data.periods.map((period, periodIndex) => {
              const breakRow =
                periodIndex === 2 ? { label: 'BREAK', time: '10:40 – 11:00' } : periodIndex === 4 ? { label: 'LUNCH', time: '12:40 – 13:30' } : null;
              return (
                <div key={period[0]} style={{ display: 'contents' }}>
                  {breakRow ? (
                    <div
                      style={{
                        gridColumn: '1/-1',
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        padding: 6,
                        background: 'color-mix(in srgb, var(--color-text) 5%, transparent)',
                        border: '1px solid var(--color-divider)',
                        borderRadius: 8,
                      }}
                    >
                      <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 13, letterSpacing: '.05em' }}>{breakRow.label}</span>
                      <span style={{ fontSize: 11.5, opacity: 0.72 }}>{breakRow.time}</span>
                    </div>
                  ) : null}
                  <div
                    style={{
                      gridColumn: '1/2',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      padding: 6,
                      border: '1px solid var(--color-divider)',
                      borderRadius: 8,
                    }}
                  >
                    <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 13, letterSpacing: '.05em' }}>{period[0]}</span>
                    <span style={{ fontSize: 11.5, opacity: 0.72 }}>{period[1]}</span>
                  </div>
                  {DAYS.map((d) => {
                    const entry = cellFor(d.index, periodIndex + 1);
                    const live = d.index === today && minutesNow >= toMinutes(period[0]) && minutesNow < toMinutes(period[1]);
                    return (
                      <div
                        key={`${d.index}-${periodIndex}`}
                        style={{
                          minHeight: 78,
                          padding: '7px 8px',
                          border: `1px solid ${live && entry ? 'var(--color-accent)' : 'var(--color-divider)'}`,
                          borderRadius: 8,
                          background: live && entry ? 'color-mix(in srgb, var(--color-accent) 22%, transparent)' : 'transparent',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 2,
                        }}
                      >
                        {entry ? (
                          <>
                            <span style={{ fontSize: 11, letterSpacing: '.08em', color: 'var(--color-accent)' }}>{entry.subject?.code ?? (entry.label === 'Library / Mentoring' ? 'LIB' : 'CLUB')}</span>
                            <span style={{ fontSize: 12.5, lineHeight: 1.2 }}>{entry.subject?.name ?? entry.label}</span>
                            <span style={{ fontSize: 11.5, opacity: 0.72, marginTop: 'auto' }}>
                              {data.scope === 'faculty' ? `Section ${entry.section}` : (entry.subject?.faculty.replace(/^(Prof\.|Dr\.)\s+/, '') ?? 'Open session')}
                            </span>
                            <span style={{ fontSize: 11.5, opacity: 0.72 }}>{entry.room}</span>
                          </>
                        ) : (
                          <span style={{ fontSize: 11, opacity: 0.62, margin: 'auto' }}>Free</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </Section>
    </>
  );
};
