'use client';

import type { ReactNode } from 'react';
import { FeedbackProvider } from './FeedbackProvider';
import { NavigationProvider } from './NavigationProvider';
import { NotificationsProvider } from './NotificationsProvider';
import { SessionProvider } from './SessionProvider';
import { ThemeProvider } from './ThemeProvider';

/**
 * Provider order matters: navigation needs the session to guard routes,
 * notifications need both, and feedback sits outermost of the three so a toast
 * survives a screen change.
 */
export const AppProviders = ({ children }: { children: ReactNode }) => (
  <ThemeProvider>
    <SessionProvider>
      <NavigationProvider>
        <FeedbackProvider>
          <NotificationsProvider>{children}</NotificationsProvider>
        </FeedbackProvider>
      </NavigationProvider>
    </SessionProvider>
  </ThemeProvider>
);
