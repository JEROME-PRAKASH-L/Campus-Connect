'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { RouteKey } from '@campus-connect/contracts';
import { isRouteAllowed } from '@/config/navigation';
import { useSession } from './SessionProvider';

type NavigationValue = {
  /** The screen actually being shown — always one the current role may open. */
  route: RouteKey;
  go: (route: RouteKey) => void;
  /** Fires whenever a navigation happens, so the shell can close its menus. */
  subscribe: (listener: () => void) => () => void;
};

const NavigationContext = createContext<NavigationValue | null>(null);

/**
 * Navigation is state, not URL — deliberately. Every screen's state (search,
 * open register, half-filled form) lives in memory, and the original build
 * reloaded nothing on a screen change. Moving to file-based routes would change
 * that behaviour, so the switch statement became this provider instead: the
 * route is one value, guarded by the role's allow-list.
 */
export const NavigationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useSession();
  const [route, setRoute] = useState<RouteKey>('dashboard');
  const [listeners] = useState(() => new Set<() => void>());

  const go = useCallback(
    (next: RouteKey) => {
      setRoute(next);
      for (const listener of listeners) listener();
    },
    [listeners],
  );

  const subscribe = useCallback(
    (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    [listeners],
  );

  // A role change must never leave the user parked on a screen they cannot open.
  const safeRoute = user && isRouteAllowed(user.role, route) ? route : 'dashboard';

  const value = useMemo<NavigationValue>(() => ({ route: safeRoute, go, subscribe }), [safeRoute, go, subscribe]);

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
};

export const useNavigation = (): NavigationValue => {
  const value = useContext(NavigationContext);
  if (!value) throw new Error('useNavigation must be used inside NavigationProvider');
  return value;
};
