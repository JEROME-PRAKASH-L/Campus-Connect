const configuredApiBase = process.env.NEXT_PUBLIC_API_BASE?.trim();

/**
 * Prefer same-origin API requests in the browser. Next.js proxies `/api/*`
 * to the Express service using the server-only `API_SERVER_URL` variable.
 * `NEXT_PUBLIC_API_BASE` remains available for deployments that intentionally
 * expose the backend directly to the browser.
 */
export const API_BASE = configuredApiBase ? configuredApiBase.replace(/\/+$/, '') : '';

const TOKEN_KEY = 'campus-connect:token';

export const getToken = () => (typeof window === 'undefined' ? null : localStorage.getItem(TOKEN_KEY));
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const requestUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${normalizedPath}`;
};

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  let response: Response;

  try {
    response = await fetch(requestUrl(path), {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError(
      'Campus Connect API is unavailable. Make sure the backend is running and configure API_SERVER_URL in the web deployment.',
      0,
    );
  }

  const text = await response.text();
  let payload: Record<string, unknown> = {};

  if (text) {
    try {
      payload = JSON.parse(text) as Record<string, unknown>;
    } catch {
      throw new ApiError(
        response.ok
          ? 'The Campus Connect API returned an invalid response.'
          : `The server returned an unexpected response (${response.status}).`,
        response.status,
      );
    }
  }

  if (!response.ok) {
    const message = typeof payload.error === 'string' ? payload.error : 'Something went wrong. Try again.';
    throw new ApiError(message, response.status);
  }

  return payload as T;
}

export const post = <T>(path: string, body?: unknown) =>
  api<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });

export const del = <T>(path: string) => api<T>(path, { method: 'DELETE' });
