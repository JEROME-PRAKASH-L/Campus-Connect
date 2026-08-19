'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { MeResponse, Permission, SessionUser } from '@campus-connect/contracts';
import { can } from '@campus-connect/contracts';
import { api, clearToken, getToken, setToken } from '@/lib/api';

type SessionValue = {
  user: SessionUser | null;
  /** True until the stored token has been checked against the API. */
  checking: boolean;
  signIn: (token: string, user: SessionUser) => void;
  signOut: () => void;
  refresh: () => Promise<void>;
  /** Permission check against the shared role matrix. Presentation only — the API re-checks. */
  can: (permission: Permission) => boolean;
};

const SessionContext = createContext<SessionValue | null>(null);

/**
 * Owns everything about "who is signed in": the stored token, the resolved user
 * and the boot-time check. Lifting it out of `page.tsx` means any component can
 * ask about the session without the answer being threaded through props.
 */
export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      setChecking(false);
      return;
    }
    api<MeResponse>('/api/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => clearToken())
      .finally(() => setChecking(false));
  }, []);

  const signIn = useCallback((token: string, next: SessionUser) => {
    setToken(token);
    setUser(next);
  }, []);

  const signOut = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = await api<MeResponse>('/api/auth/me');
      setUser(data.user);
    } catch {
      clearToken();
      setUser(null);
    }
  }, []);

  const value = useMemo<SessionValue>(
    () => ({ user, checking, signIn, signOut, refresh, can: (permission) => (user ? can(user.role, permission) : false) }),
    [user, checking, signIn, signOut, refresh],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export const useSession = (): SessionValue => {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
};

/** The signed-in user, for components that only render behind the login gate. */
export const useCurrentUser = (): SessionUser => {
  const { user } = useSession();
  if (!user) throw new Error('useCurrentUser requires a signed-in session');
  return user;
};
