'use client';

import type { ReactNode } from 'react';
import { Icon } from './primitives';

export type PageAction = { label: string; icon: string; onClick: () => void; primary?: boolean };

export const PageHeader = ({ kicker, title, sub, actions = [] }: { kicker: string; title: string; sub: string; actions?: PageAction[] }) => (
  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', borderBottom: '1px solid var(--color-divider)', paddingBottom: 'var(--space-4)' }}>
    <div style={{ minWidth: 0, maxWidth: '76ch' }}>
      <div className="eyebrow">{kicker}</div>
      <h2 className="display" style={{ margin: '10px 0', fontSize: 'clamp(34px,3.6vw,52px)' }}>
        {title}
      </h2>
      <p className="text-muted" style={{ fontSize: 14.5, lineHeight: 1.55, margin: 0, maxWidth: '68ch', textWrap: 'pretty' }}>
        {sub}
      </p>
    </div>
    {actions.length ? (
      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', alignSelf: 'flex-end' }}>
        {actions.map((a) => (
          <button key={a.label} type="button" className={`btn ${a.primary ? 'btn-primary' : 'btn-secondary'}`} onClick={a.onClick} style={{ whiteSpace: 'nowrap', letterSpacing: '.06em' }}>
            <Icon path={a.icon} size={15} />
            <span>{a.label}</span>
          </button>
        ))}
      </div>
    ) : null}
  </div>
);

export const PageState = ({ children }: { children: ReactNode }) => (
  <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>{children}</div>
);
