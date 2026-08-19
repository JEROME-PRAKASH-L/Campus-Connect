'use client';

import { Section, SectionHead, Empty } from './primitives';
import { attendanceTone } from '@/lib/utilities/format';

export const AttendanceDonut = ({
  title,
  meta,
  percentage,
  caption,
  bars,
  note,
}: {
  title: string;
  meta: string;
  percentage: number;
  caption: string;
  bars: { label: string; value: number }[];
  note: string;
}) => {
  const tone = attendanceTone(percentage);
  const circumference = 2 * Math.PI * 51;
  return (
    <Section>
      <SectionHead title={title} meta={meta} />
      <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center', flexWrap: 'wrap' }}>
        <svg viewBox="0 0 120 120" style={{ width: 138, height: 138, flex: 'none' }} role="img" aria-label={`${percentage}% ${caption}`}>
          <circle cx="60" cy="60" r="51" fill="none" stroke="var(--color-divider)" strokeWidth="9" />
          <circle
            cx="60"
            cy="60"
            r="51"
            fill="none"
            stroke={tone}
            strokeWidth="9"
            strokeDasharray={`${((percentage / 100) * circumference).toFixed(1)} 999`}
            transform="rotate(-90 60 60)"
            style={{ transition: 'stroke-dasharray .7s ease-out' }}
          />
          <text x="60" y="57" textAnchor="middle" style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 27, fill: 'var(--color-text)' }}>
            {percentage}%
          </text>
          <text x="60" y="73" textAnchor="middle" style={{ fontSize: 9, letterSpacing: '.14em', fill: 'var(--color-text)', opacity: 0.72 }}>
            {caption}
          </text>
        </svg>
        <div style={{ flex: 1, minWidth: 150, display: 'flex', flexDirection: 'column', gap: 9 }}>
          {bars.map((b) => {
            const barTone = attendanceTone(b.value);
            return (
              <div key={b.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12, marginBottom: 3 }}>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.label}</span>
                  <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, color: barTone }}>{b.value}%</span>
                </div>
                <div style={{ height: 5, background: 'var(--color-divider)' }}>
                  <div className="anim-grow" style={{ height: 5, width: `${Math.min(b.value, 100)}%`, background: barTone }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ fontSize: 11.5, opacity: 0.72, borderTop: '1px solid var(--color-divider)', paddingTop: 9 }}>{note}</div>
    </Section>
  );
};

export const BarChart = ({
  title,
  meta,
  bars,
  note,
}: {
  title: string;
  meta: string;
  bars: { label: string; value: string; height: number; tone?: string }[];
  note: string;
}) => (
  <Section>
    <SectionHead title={title} meta={meta} />
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 170, paddingTop: 6 }}>
      {bars.map((b) => {
        const tone = b.tone ?? 'var(--color-accent)';
        return (
          <div key={b.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 14, color: tone }}>{b.value}</span>
            <div
              className="anim-pop"
              style={{ width: '100%', height: `${Math.min(b.height, 100)}%`, background: `color-mix(in srgb, ${tone} 16%, transparent)`, border: `1px solid ${tone}`, borderRadius: '4px 4px 0 0' }}
            />
            <span style={{ fontSize: 11.5, opacity: 0.72, letterSpacing: '.06em', textAlign: 'center' }}>{b.label}</span>
          </div>
        );
      })}
    </div>
    <div style={{ fontSize: 11.5, opacity: 0.72, borderTop: '1px solid var(--color-divider)', paddingTop: 9 }}>{note}</div>
  </Section>
);

export const TodayClasses = ({
  label,
  classes,
}: {
  label: string;
  classes: { code: string; name: string; who: string; room: string; start: string; end: string; live: boolean }[];
}) => (
  <Section>
    <SectionHead title="Today’s classes" meta={label} />
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {classes.length === 0 ? (
        <Empty>No scheduled classes today.</Empty>
      ) : (
        classes.map((c, i) => (
          <div
            key={`${c.code}-${c.start}-${i}`}
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'stretch',
              padding: '9px 11px',
              borderRadius: 10,
              border: `1px solid ${c.live ? 'var(--color-accent)' : 'var(--color-divider)'}`,
              background: c.live ? 'color-mix(in srgb, var(--color-accent) 12%, transparent)' : 'transparent',
              transition: 'background .2s',
            }}
          >
            <div style={{ width: 62, flex: 'none', lineHeight: 1.25 }}>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 15 }}>{c.start}</div>
              <div style={{ fontSize: 11.5, opacity: 0.72 }}>{c.end}</div>
            </div>
            <div style={{ width: 1, background: 'var(--color-divider)', flex: 'none' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{c.name}</span>
                {c.code !== '—' ? <span className="tag tag-outline">{c.code}</span> : null}
                {c.live ? (
                  <span style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', background: 'var(--color-accent)', color: '#fff', padding: '2px 6px', borderRadius: 6 }}>In progress</span>
                ) : null}
              </div>
              <div style={{ fontSize: 12, opacity: 0.72, marginTop: 2 }}>
                {c.who} · Room {c.room}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  </Section>
);

export const AnnouncementFeed = ({
  items,
  onViewAll,
}: {
  items: { title: string; body: string; kind: string; tone: string; createdAt: string }[];
  onViewAll: () => void;
}) => (
  <Section>
    <SectionHead
      title="Announcements"
      action={
        <button type="button" className="btn btn-ghost" style={{ fontSize: 11.5 }} onClick={onViewAll}>
          View all
        </button>
      }
    />
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {items.length === 0 ? (
        <Empty>Nothing announced yet.</Empty>
      ) : (
        items.map((item, i) => {
          const date = new Date(item.createdAt);
          return (
            <div key={`${item.title}-${i}`} style={{ display: 'flex', gap: 11, padding: '10px 0', borderBottom: '1px solid var(--color-divider)' }}>
              <div style={{ width: 44, flex: 'none', textAlign: 'center', border: '1px solid var(--color-divider)', borderRadius: 8, padding: '3px 0', height: 'fit-content' }}>
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 16, lineHeight: 1 }}>{String(date.getDate()).padStart(2, '0')}</div>
                <div className="eyebrow" style={{ whiteSpace: 'nowrap' }}>
                  {date.toLocaleDateString('en-GB', { month: 'short' })}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, lineHeight: 1.35 }}>{item.title}</div>
                <div style={{ fontSize: 11.5, opacity: 0.72, marginTop: 2 }}>{item.body}</div>
                <div style={{ marginTop: 5 }}>
                  <span className={`tag ${item.tone === 'WARN' || item.tone === 'BAD' ? 'tag-neutral' : 'tag-accent'}`} style={{ fontSize: 11.5 }}>
                    {item.kind.charAt(0) + item.kind.slice(1).toLowerCase()}
                  </span>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  </Section>
);

export const UpcomingList = ({ events }: { events: { title: string; date: string; tone: string }[] }) => (
  <Section>
    <SectionHead title="Upcoming" />
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {events.length === 0 ? (
        <Empty>Nothing scheduled.</Empty>
      ) : (
        events.map((e, i) => (
          <div key={`${e.title}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '8px 0', borderBottom: '1px solid var(--color-divider)' }}>
            <span
              style={{
                width: 9,
                height: 9,
                flex: 'none',
                borderRadius: 2,
                border: `1px solid ${e.tone === 'WARN' ? 'var(--status-warn)' : e.tone === 'BAD' ? 'var(--status-bad)' : e.tone === 'OK' ? 'var(--status-ok)' : 'var(--color-accent)'}`,
                background: 'color-mix(in srgb, var(--color-accent) 22%, transparent)',
              }}
            />
            <span style={{ flex: 1, minWidth: 0, fontSize: 13 }}>{e.title}</span>
            <span style={{ fontSize: 11.5, opacity: 0.72, whiteSpace: 'nowrap' }}>
              {new Date(e.date).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })}
            </span>
          </div>
        ))
      )}
    </div>
  </Section>
);

export const Grid = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(330px,1fr))', gap: 'var(--space-6)', alignItems: 'start' }}>{children}</div>
);

export const CardGrid = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(304px,1fr))', gap: 'var(--space-6)' }}>{children}</div>
);
