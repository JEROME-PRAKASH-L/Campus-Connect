'use client';

import type { CSSProperties, ReactNode } from 'react';

export const Icon = ({ path, size = 17, strokeWidth = 1.5, style }: { path: string; size?: number; strokeWidth?: number; style?: CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden="true">
    <path d={path} />
  </svg>
);

export const Section = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => (
  <section className="card" style={{ padding: 20, gap: 'var(--space-3)', ...style }}>
    {children}
  </section>
);

export const SectionHead = ({ title, meta, action }: { title: string; meta?: string; action?: ReactNode }) => (
  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
    <h3 className="display" style={{ margin: 0, fontSize: 22 }}>
      {title}
    </h3>
    {meta ? (
      <span className="eyebrow" style={{ whiteSpace: 'nowrap' }}>
        {meta}
      </span>
    ) : null}
    {action}
  </div>
);

export type KpiSpec = {
  label: string;
  value: string;
  sub: string;
  icon: string;
  tone?: string;
  bar?: string;
};

const inkFor = (tone?: string) =>
  tone === 'var(--status-bad)' ? 'var(--bad-ink)' : tone === 'var(--status-warn)' ? 'var(--warn-ink)' : 'var(--color-text)';

export const KpiCards = ({ kpis }: { kpis: KpiSpec[] }) => {
  if (!kpis.length) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(198px,1fr))', gap: 20 }}>
      {kpis.map((k) => {
        const tone = k.tone ?? 'var(--color-accent)';
        return (
          <div key={k.label} className="card lift anim-fade-up" style={{ padding: 'var(--space-4)', paddingTop: 22, gap: 'var(--space-2)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: 10.5, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--muted)' }}>{k.label}</span>
              <span style={{ color: 'var(--color-accent-700)' }}>
                <Icon path={k.icon} size={15} />
              </span>
            </div>
            <div className="figure" style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 42, lineHeight: 0.98, letterSpacing: '-.01em', color: inkFor(k.tone) }}>
              {k.value}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.4 }}>{k.sub}</div>
            <div style={{ height: 2, background: 'var(--color-divider)', marginTop: 'auto' }}>
              <div className="anim-grow" style={{ height: 2, width: k.bar ?? '50%', background: tone }} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const Tag = ({ children, kind = 'tag-neutral' }: { children: ReactNode; kind?: string }) => (
  <span className={`tag ${kind}`}>{children}</span>
);

export const Bar = ({ value, tone }: { value: number; tone?: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 120 }}>
    <div style={{ flex: 1, height: 5, background: 'var(--color-divider)' }}>
      <div style={{ height: 5, width: `${Math.min(value, 100)}%`, background: tone ?? 'var(--color-accent)' }} />
    </div>
    <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 13.5, color: tone ?? 'var(--color-accent)', width: 46, textAlign: 'right' }}>
      {value}%
    </span>
  </div>
);

export const Empty = ({ children }: { children: ReactNode }) => (
  <div className="text-muted" style={{ fontSize: 13, padding: '14px 2px' }}>
    {children}
  </div>
);

export const Chips = ({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
    {options.map((option) => {
      const on = option === value;
      return (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 600,
            fontSize: 12.5,
            letterSpacing: '.05em',
            textTransform: 'uppercase',
            padding: '5px 11px',
            borderRadius: 8,
            border: `1px solid ${on ? 'var(--color-accent)' : 'var(--color-divider)'}`,
            background: on ? 'var(--color-accent)' : 'transparent',
            color: on ? '#fff' : 'var(--color-text)',
            cursor: 'pointer',
            transition: 'background .15s',
          }}
        >
          {option}
        </button>
      );
    })}
  </div>
);

export const Select = ({ value, options, onChange, style }: { value: string; options: string[]; onChange: (v: string) => void; style?: CSSProperties }) => (
  <select className="input" value={value} onChange={(e) => onChange(e.target.value)} style={{ width: 'auto', minWidth: 132, ...style }}>
    {options.map((o) => (
      <option key={o} value={o}>
        {o}
      </option>
    ))}
  </select>
);
