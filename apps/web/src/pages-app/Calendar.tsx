'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ICONS } from '@/lib/icons';
import { shortDate, toneVar } from '@/lib/format';
import { useShell } from '@/components/AppShell';
import { PageHeader, PageState } from '@/components/PageHeader';
import { KpiCards, Section, SectionHead, Tag } from '@/components/primitives';
import { DataTable, TwoLine } from '@/components/DataTable';

type CalendarEvent = { id: string; title: string; date: string; tag: string; tone: string };

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DOWS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const Calendar = () => {
  const { toast } = useShell();
  const [events, setEvents] = useState<CalendarEvent[] | null>(null);
  const [cursor, setCursor] = useState(() => new Date());
  const [error, setError] = useState('');

  useEffect(() => {
    api<{ events: CalendarEvent[] }>('/api/calendar')
      .then((d) => setEvents(d.events))
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load the calendar.'));
  }, []);

  if (error) return <PageState>{error}</PageState>;
  if (!events) return <PageState>Loading the calendar…</PageState>;

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const startDow = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDaysInMonth = new Date(year, month, 0).getDate();
  const today = new Date();

  const eventsOn = (day: number) =>
    events.filter((e) => {
      const d = new Date(e.date);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });

  const cells: { n: number; muted: boolean; isToday: boolean; events: CalendarEvent[] }[] = [];
  for (let i = 0; i < startDow; i += 1) cells.push({ n: prevDaysInMonth - startDow + 1 + i, muted: true, isToday: false, events: [] });
  for (let d = 1; d <= daysInMonth; d += 1) {
    cells.push({
      n: d,
      muted: false,
      isToday: today.getFullYear() === year && today.getMonth() === month && today.getDate() === d,
      events: eventsOn(d),
    });
  }
  let trailing = 1;
  while (cells.length % 7 !== 0) cells.push({ n: trailing++, muted: true, isToday: false, events: [] });

  const upcoming = events.filter((e) => new Date(e.date) >= new Date(today.getFullYear(), today.getMonth(), today.getDate()));

  return (
    <>
      <PageHeader
        kicker={`Academic calendar ${year}`}
        title="Calendar"
        sub="Examinations, holidays, fee dates and institute events for the current semester."
        actions={[{ label: 'Export .ics', icon: ICONS.down, onClick: () => toast('Academic calendar exported.') }]}
      />
      <KpiCards
        kpis={[
          { label: 'Events', value: String(events.length), sub: 'On the calendar', icon: ICONS.cal, tone: 'var(--color-accent)', bar: '78%' },
          { label: 'Upcoming', value: String(upcoming.length), sub: upcoming.length ? `Next ${shortDate(upcoming[0].date)}` : 'Nothing scheduled', icon: ICONS.clock, tone: 'var(--color-accent)', bar: '45%' },
          { label: 'Examination days', value: String(events.filter((e) => e.tag === 'Examination').length), sub: 'Model + end semester', icon: ICONS.cap, tone: 'var(--status-warn)', bar: '30%' },
          { label: 'Holidays', value: String(events.filter((e) => e.tag === 'Holiday').length), sub: 'Institute closed', icon: ICONS.cal, tone: 'var(--status-ok)', bar: '20%' },
        ]}
      />

      <Section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <SectionHead title={`${MONTHS[month]} ${year}`} />
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button type="button" className="btn btn-secondary" style={{ fontSize: 12.5 }} onClick={() => setCursor(new Date(year, month - 1, 1))}>
              ← Previous
            </button>
            <button type="button" className="btn btn-secondary" style={{ fontSize: 12.5 }} onClick={() => setCursor(new Date(year, month + 1, 1))}>
              Next →
            </button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 1, background: 'var(--color-divider)', border: '1px solid var(--color-divider)', borderRadius: 8, overflow: 'hidden' }}>
          {DOWS.map((d) => (
            <div key={d} style={{ background: 'var(--color-bg)', padding: '7px 6px', textAlign: 'center', fontSize: 11.5, letterSpacing: '.12em', textTransform: 'uppercase', opacity: 0.72 }}>
              {d}
            </div>
          ))}
          {cells.map((cell, i) => (
            <div key={i} style={{ background: 'var(--color-bg)', minHeight: 92, padding: '6px 7px', opacity: cell.muted ? 0.3 : 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 14, color: cell.isToday ? 'var(--color-accent)' : 'var(--color-text)' }}>{cell.n}</span>
                {cell.isToday ? <span style={{ fontSize: 11, letterSpacing: '.1em', background: 'var(--color-accent)', color: '#fff', padding: '1px 5px', borderRadius: 4 }}>TODAY</span> : null}
              </div>
              {cell.events.map((e) => (
                <div key={e.id} style={{ fontSize: 11.5, lineHeight: 1.25, borderLeft: `2px solid ${toneVar(e.tone)}`, paddingLeft: 5, opacity: 0.85 }}>
                  {e.title}
                </div>
              ))}
            </div>
          ))}
        </div>
      </Section>

      <DataTable
        title="Key dates"
        sub="Upcoming events"
        columns={[{ label: 'Date' }, { label: 'Event' }, { label: 'Type' }, { label: '', align: 'right', width: '140px' }]}
        rows={events.map((e) => ({
          key: e.id,
          cells: [
            shortDate(e.date),
            <TwoLine key="n" top={e.title} bottom={new Date(e.date).toLocaleDateString('en-GB', { weekday: 'long' })} />,
            <Tag key="t" kind={e.tone === 'WARN' || e.tone === 'BAD' ? 'tag-neutral' : 'tag-accent'}>
              {e.tag}
            </Tag>,
            <button key="r" type="button" className="btn btn-secondary" style={{ fontSize: 11.5, padding: '3px 9px' }} onClick={() => toast(`Reminder set for “${e.title}”.`)}>
              Remind me
            </button>,
          ],
        }))}
        note="Dates are approved by the academic council at the start of each semester."
      />
    </>
  );
};
