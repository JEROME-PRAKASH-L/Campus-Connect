'use client';

import type { RouteKey, SessionUser } from '@campus-connect/contracts';
import { Icon } from '@/components/ui/primitives';
import { ICONS } from '@/lib/utilities/icons';
import { ACADEMIC_YEARS } from './shell-labels';
import { GlobalSearch } from './GlobalSearch';
import { NotificationBell } from './NotificationBell';

export const Header = ({
  user,
  pageTitle,
  width,
  mobile,
  theme,
  academicYear,
  searchOpen,
  onToggleNav,
  onToggleSearch,
  onToggleTheme,
  onAcademicYear,
  onGo,
  onToast,
  onSignOut,
}: {
  user: SessionUser;
  pageTitle: string;
  width: number;
  mobile: boolean;
  theme: string;
  academicYear: string;
  searchOpen: boolean;
  onToggleNav: () => void;
  onToggleSearch: () => void;
  onToggleTheme: () => void;
  onAcademicYear: (year: string) => void;
  onGo: (route: RouteKey) => void;
  onToast: (message: string) => void;
  onSignOut: () => void;
}) => (
  <header
    style={{
      position: 'sticky',
      top: 0,
      zIndex: 45,
      background: 'color-mix(in srgb, var(--color-bg) 88%, transparent)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid var(--color-divider)',
      padding: '12px var(--space-6)',
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
    }}
  >
    <button type="button" className="btn btn-secondary btn-icon" onClick={onToggleNav} title="Menu" aria-label="Toggle navigation" style={{ display: mobile ? 'inline-flex' : 'none' }}>
      <Icon path={ICONS.menu} />
    </button>

    <div style={{ minWidth: 0, display: width < 700 ? 'none' : 'flex', alignItems: 'center', gap: 10, overflow: 'hidden', flex: '1 1 auto' }}>
      {width >= 1180 ? (
        <>
          <span className="eyebrow" style={{ whiteSpace: 'nowrap' }}>
            {user.roleLabel}
          </span>
          <span style={{ width: 14, height: 1, background: 'var(--color-divider)', flex: 'none' }} />
        </>
      ) : null}
      <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 16, letterSpacing: '.14em', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {pageTitle}
      </span>
    </div>

    <GlobalSearch visible={width >= 1100 || searchOpen} onGo={onGo} />

    <button type="button" className="btn btn-secondary btn-icon" onClick={onToggleSearch} title="Search" aria-label="Search" style={{ display: width < 1100 ? 'inline-flex' : 'none' }}>
      <Icon path={ICONS.search} strokeWidth={1.7} />
    </button>

    <button type="button" className="btn btn-secondary btn-icon" onClick={onToggleTheme} title="Toggle theme" aria-label="Toggle theme">
      <Icon path={theme === 'light' ? ICONS.moon : ICONS.sun} />
    </button>

    <NotificationBell onGo={onGo} onToast={onToast} />

    {width >= 1180 ? (
      <select
        className="input"
        value={academicYear}
        onChange={(e) => onAcademicYear(e.target.value)}
        title="Academic year"
        aria-label="Academic year"
        style={{ width: 'auto', minWidth: 118, flex: 'none', height: 36, fontSize: 13, fontWeight: 600 }}
      >
        {ACADEMIC_YEARS.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    ) : null}

    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 'none', paddingLeft: 12, borderLeft: '1px solid var(--color-divider)' }}>
      <div style={{ width: 36, height: 36, flex: 'none', display: 'grid', placeItems: 'center', borderRadius: 999, background: 'var(--purple)', color: '#fff', fontSize: 13, fontWeight: 700 }}>{user.initials}</div>
      {width >= 1180 ? (
        <div style={{ lineHeight: 1.25 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: 'nowrap' }}>{user.name}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{user.roleLabel}</div>
        </div>
      ) : null}
      <button type="button" className="btn btn-secondary btn-icon" onClick={onSignOut} title="Log out" aria-label="Log out">
        <Icon path={ICONS.out} strokeWidth={1.7} />
      </button>
    </div>
  </header>
);
