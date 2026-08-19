'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { navFor } from '@/config/navigation';
import { useViewportWidth } from '@/hooks/useViewportWidth';
import { useFeedback } from '@/providers/FeedbackProvider';
import { useNavigation } from '@/providers/NavigationProvider';
import { useNotifications } from '@/providers/NotificationsProvider';
import { useSession } from '@/providers/SessionProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { Header } from './Header';
import { MobileNavigation } from './MobileNavigation';
import { Sidebar, type SidebarItem } from './Sidebar';
import { ACADEMIC_YEAR, labelForRoute } from './shell-labels';

/**
 * Frame only. Session, navigation, notifications, toasts and modals all live in
 * providers now; the shell composes the rail, the header and the content well,
 * and owns nothing but its own open/closed UI state.
 */
export const AppShell = ({ children }: { children: ReactNode }) => {
  const { user, signOut } = useSession();
  const { route, go, subscribe } = useNavigation();
  const { toast } = useFeedback();
  const { unread } = useNotifications();
  const { theme, toggle } = useTheme();

  const [navOpen, setNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [academicYear, setAcademicYear] = useState<string>(ACADEMIC_YEAR);
  const width = useViewportWidth();

  // Any navigation — sidebar, search result, notification — closes the menus.
  useEffect(() => subscribe(() => setNavOpen(false)), [subscribe]);

  const mobile = width < 900;
  const wide = !mobile || navOpen;

  const nav = useMemo<SidebarItem[]>(
    () =>
      user
        ? navFor(user.role).map((item) => ({
            ...item,
            on: route === item.key,
            badge: item.key === 'notifications' ? unread || null : null,
          }))
        : [],
    [user, route, unread],
  );

  if (!user) return null;

  return (
    <div data-theme={theme} style={{ minHeight: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)', fontFamily: 'var(--font-body)', fontSize: 15 }}>
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'flex-start' }}>
        <MobileNavigation open={mobile && navOpen} onClose={() => setNavOpen(false)} />

        <Sidebar user={user} items={nav} mobile={mobile} navOpen={navOpen} wide={wide} onGo={go} onSignOut={signOut} />

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <Header
            user={user}
            pageTitle={labelForRoute(route)}
            width={width}
            mobile={mobile}
            theme={theme}
            academicYear={academicYear}
            searchOpen={searchOpen}
            onToggleNav={() => setNavOpen((v) => !v)}
            onToggleSearch={() => setSearchOpen((v) => !v)}
            onToggleTheme={toggle}
            onAcademicYear={(year) => {
              setAcademicYear(year);
              toast(`Academic year switched to ${year}.`);
            }}
            onGo={go}
            onToast={toast}
            onSignOut={signOut}
          />

          <main style={{ width: '100%', maxWidth: 1480, margin: '0 auto', padding: 'var(--space-8) var(--space-6)', display: 'flex', flexDirection: 'column', gap: 34 }}>{children}</main>
        </div>
      </div>
    </div>
  );
};

export { useShell } from './shell-context';
