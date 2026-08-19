'use client';

const TOKEN_KEY = 'campus-connect:token';

/**
 * Token storage, isolated from the fetch layer so swapping the mechanism —
 * to a cookie, say — touches this file and nothing else.
 */
export const getToken = (): string | null => (typeof window === 'undefined' ? null : window.localStorage.getItem(TOKEN_KEY));

export const setToken = (token: string): void => {
  if (typeof window !== 'undefined') window.localStorage.setItem(TOKEN_KEY, token);
};

export const clearToken = (): void => {
  if (typeof window !== 'undefined') window.localStorage.removeItem(TOKEN_KEY);
};

export const hasToken = (): boolean => getToken() !== null;
