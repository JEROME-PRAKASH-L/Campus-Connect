'use client';

import { useEffect, useState } from 'react';
import { api, clearToken, getToken } from '@/lib/api';
import { isRouteAllowed } from '@/lib/nav';
import type { RouteKey, SessionUser } from '@/lib/types';
import { AppShell } from '@/components/AppShell';
import { LoginScreen } from '@/components/LoginScreen';
import { Icon } from '@/components/primitives';
import { ICONS } from '@/lib/icons';
import { Dashboard } from '@/pages-app/Dashboard';
import { Profile } from '@/pages-app/Profile';
import { People } from '@/pages-app/People';
import { Attendance } from '@/pages-app/Attendance';
import { Timetable } from '@/pages-app/Timetable';
import { Academics } from '@/pages-app/Academics';
import { Assignments } from '@/pages-app/Assignments';
import { Examinations } from '@/pages-app/Examinations';
import { Results } from '@/pages-app/Results';
import { Fees } from '@/pages-app/Fees';
import { Leave } from '@/pages-app/Leave';
import { Materials } from '@/pages-app/Materials';
import { Notifications } from '@/pages-app/Notifications';
import { Calendar } from '@/pages-app/Calendar';
import { Placement } from '@/pages-app/Placement';
import { Reports } from '@/pages-app/Reports';
import { Settings } from '@/pages-app/Settings';

const THEME_KEY = 'campus-connect:theme';

export default function Home() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [route, setRoute] = useState<RouteKey>('dashboard');
  const [theme, setTheme] = useState('light');
  const [checking, setChecking] = useState(true);
  const [loginToast, setLoginToast] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored) setTheme(stored);

    if (!getToken()) {
      setChecking(false);
      return;
    }
    api<{ user: SessionUser }>('/api/auth/me')
      .then((d) => setUser(d.user))
      .catch(() => clearToken())
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (!loginToast) return;
    const handle = setTimeout(() => setLoginToast(null), 2800);
    return () => clearTimeout(handle);
  }, [loginToast]);

  if (checking) {
    return (
      <div data-theme={theme} style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--color-bg)', color: 'var(--muted)', fontFamily: 'var(--font-body)' }}>
        Loading DMI Campus Connect…
      </div>
    );
  }

  if (!user) {
    return (
      <div data-theme={theme}>
        <LoginScreen
          onSignedIn={(next) => {
            setUser(next);
            setRoute('dashboard');
          }}
          onToast={setLoginToast}
        />
        {loginToast ? (
          <div
            className="elev-lg anim-fade-up"
            role="status"
            style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 90, background: 'var(--color-bg)', border: '1px solid var(--color-divider)', borderRadius: 10, padding: '11px 15px', display: 'flex', alignItems: 'center', gap: 10, maxWidth: 340 }}
          >
            <span style={{ color: 'var(--status-ok)', flex: 'none' }}>
              <Icon path={ICONS.check} size={16} />
            </span>
            <span style={{ fontSize: 13 }}>{loginToast}</span>
          </div>
        ) : null}
      </div>
    );
  }

  const safeRoute = isRouteAllowed(user.role, route) ? route : 'dashboard';

  const page = (() => {
    switch (safeRoute) {
      case 'profile':
        return <Profile />;
      case 'people':
        return <People />;
      case 'attendance':
        return <Attendance />;
      case 'timetable':
        return <Timetable />;
      case 'academics':
        return <Academics />;
      case 'assignments':
        return <Assignments />;
      case 'examinations':
        return <Examinations />;
      case 'results':
        return <Results />;
      case 'fees':
        return <Fees />;
      case 'leave':
        return <Leave />;
      case 'materials':
        return <Materials />;
      case 'notifications':
        return <Notifications />;
      case 'calendar':
        return <Calendar />;
      case 'placement':
        return <Placement />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <Settings theme={theme} onTheme={setTheme} />;
      default:
        return <Dashboard />;
    }
  })();

  return (
    <AppShell user={user} onSignOut={() => setUser(null)} route={safeRoute} onRoute={setRoute} theme={theme} onTheme={setTheme}>
      {page}
    </AppShell>
  );
}
