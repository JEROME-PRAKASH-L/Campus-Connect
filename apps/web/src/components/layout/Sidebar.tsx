'use client';

import type { RouteKey, SessionUser } from '@campus-connect/contracts';
import { Icon } from '@/components/ui/primitives';
import { ICONS } from '@/lib/utilities/icons';
import type { NavItem } from '@/config/navigation';

export type SidebarItem = NavItem & { on: boolean; badge: number | null };

export const Sidebar = ({
  user,
  items,
  mobile,
  navOpen,
  wide,
  onGo,
  onSignOut,
}: {
  user: SessionUser;
  items: SidebarItem[];
  mobile: boolean;
  navOpen: boolean;
  wide: boolean;
  onGo: (route: RouteKey) => void;
  onSignOut: () => void;
}) => (
  <aside
    className="rail"
    style={{
      flex: 'none',
      display: mobile && !navOpen ? 'none' : 'flex',
      flexDirection: 'column',
      gap: 'var(--space-4)',
      width: mobile ? 250 : 232,
      position: mobile ? 'fixed' : 'sticky',
      top: 0,
      left: 0,
      height: '100vh',
      zIndex: 60,
      color: 'var(--rail-ink)',
      borderRight: '1px solid rgba(238,242,246,.14)',
      padding: 'var(--space-4) var(--space-3)',
      overflowY: 'auto',
      overflowX: 'hidden',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 4px 0 2px' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/dmi-logo.png" alt="DMI Campus Connect" style={{ width: 34, height: 34, flex: 'none', objectFit: 'contain' }} />
      {wide ? (
        <div style={{ lineHeight: 1.25, minWidth: 0, flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 14.5, color: '#FBFCFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            DMI Campus Connect
          </div>
          <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '.1em', color: 'rgba(238,241,250,.72)', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            DMI College of Engg.
          </div>
        </div>
      ) : null}
    </div>

    <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          className="rail-item"
          onClick={() => onGo(item.key)}
          title={item.label}
          aria-current={item.on ? 'page' : undefined}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            width: '100%',
            padding: '10px 11px',
            border: 0,
            borderLeft: `3px solid ${item.on ? '#F2B417' : 'transparent'}`,
            borderRadius: '0 10px 10px 0',
            cursor: 'pointer',
            textAlign: 'left',
            background: item.on ? 'rgba(107,63,160,.34)' : 'transparent',
            color: item.on ? '#FBFCFF' : 'rgba(238,241,250,.82)',
            transition: 'background .15s, color .15s',
          }}
        >
          <Icon path={item.icon} size={18} strokeWidth={1.7} style={{ flex: 'none' }} />
          {wide ? <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span> : null}
          {item.badge ? (
            <span style={{ fontSize: 11, fontWeight: 700, minWidth: 20, height: 19, padding: '0 6px', borderRadius: 999, display: 'grid', placeItems: 'center', background: 'var(--gold)', color: '#3A2A02' }}>
              {item.badge}
            </span>
          ) : null}
        </button>
      ))}
    </nav>

    <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', paddingTop: 'var(--space-4)', borderTop: '1px solid rgba(238,242,246,.16)' }}>
      {wide ? (
        <>
          <div style={{ fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'rgba(238,242,246,.66)' }}>Signed in as</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 30, height: 30, flex: 'none', display: 'grid', placeItems: 'center', borderRadius: 999, background: 'var(--purple)', color: '#fff', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 12 }}>
              {user.initials}
            </div>
            <div style={{ minWidth: 0, lineHeight: 1.25 }}>
              <div style={{ fontSize: 13, color: '#f6f8fa', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
              <div style={{ fontSize: 10.5, color: 'rgba(238,242,246,.72)', letterSpacing: '.12em', textTransform: 'uppercase' }}>{user.roleLabel}</div>
            </div>
          </div>
        </>
      ) : null}
      <button
        type="button"
        className="rail-item"
        onClick={onSignOut}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 9,
          padding: 10,
          border: '1px solid rgba(238,242,246,.28)',
          borderRadius: 10,
          background: 'transparent',
          color: '#eef2f6',
          cursor: 'pointer',
          fontFamily: 'var(--font-heading)',
          fontWeight: 600,
          fontSize: 12.5,
          letterSpacing: '.14em',
          textTransform: 'uppercase',
        }}
      >
        <Icon path={ICONS.out} size={15} />
        {wide ? <span>Sign out</span> : null}
      </button>
    </div>
  </aside>
);
