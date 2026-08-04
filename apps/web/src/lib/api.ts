// Deployed, the API is served as serverless functions on the same origin as
// this app, so an empty base means "call /api/... on this domain" — nothing to
// configure and no cross-origin request. `next dev` runs the API separately, so
// it keeps the local default. Set NEXT_PUBLIC_API_BASE to override either.
const DEFAULT_API_BASE = process.env.NODE_ENV === 'development' ? 'http://localhost:4000' : '';

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? DEFAULT_API_BASE;

const TOKEN_KEY = 'campus-connect:token';

export const getToken = () => (typeof window === 'undefined' ? null : localStorage.getItem(TOKEN_KEY));
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new ApiError(payload.error ?? 'Something went wrong. Try again.', response.status);
  }
  return payload as T;
}

export const post = <T>(path: string, body?: unknown) =>
  api<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });

export const del = <T>(path: string) => api<T>(path, { method: 'DELETE' });
