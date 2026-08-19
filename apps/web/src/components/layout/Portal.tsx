'use client';

import { LoginScreen } from '@/features/auth/components/LoginScreen';
import { SCREENS } from '@/features/screens';
import { useNavigation } from '@/providers/NavigationProvider';
import { useSession } from '@/providers/SessionProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { AppShell } from './AppShell';

/**
 * Decides between the three states the application can be in: still checking a
 * stored token, signed out, or signed in and showing a screen.
 */
export const Portal = () => {
  const { user, checking } = useSession();
  const { route } = useNavigation();
  const { theme } = useTheme();

  if (checking) {
    return (
      <div
        data-theme={theme}
        style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--color-bg)', color: 'var(--muted)', fontFamily: 'var(--font-body)' }}
      >
        Loading DMI Campus Connect…
      </div>
    );
  }

  if (!user) {
    return (
      <div data-theme={theme}>
        <LoginScreen />
      </div>
    );
  }

  const Screen = SCREENS[route];

  return (
    <AppShell>
      <Screen />
    </AppShell>
  );
};
