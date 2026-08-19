'use client';

import { AppProviders } from '@/providers/AppProviders';
import { Portal } from '@/components/layout/Portal';

/**
 * The composition root: providers wrapped around the portal, nothing else.
 * Authentication lives in `SessionProvider`, navigation in
 * `NavigationProvider`, and screen selection in `features/screens.tsx`.
 */
export default function Home() {
  return (
    <AppProviders>
      <Portal />
    </AppProviders>
  );
}
