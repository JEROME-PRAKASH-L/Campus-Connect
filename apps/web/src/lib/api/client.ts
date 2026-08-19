'use client';

import { ApiError } from './errors';
import { clearToken, getToken } from './token';

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4000';

type Options = RequestInit & {
  /** Skip the automatic token clear on a 401. Used by the session bootstrap. */
  keepSessionOn401?: boolean;
};

/**
 * The single door to the API. Attaches the bearer token, normalises errors into
 * `ApiError` (carrying field-level messages when the server validated a form)
 * and drops a dead session so the app falls back to the login screen.
 */
export async function api<T>(path: string, init: Options = {}): Promise<T> {
  const { keepSessionOn401, ...rest } = init;
  const token = getToken();

  const response = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...rest.headers,
    },
  });

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as Record<string, unknown>) : {};

  if (!response.ok) {
    if (response.status === 401 && !keepSessionOn401) clearToken();
    throw new ApiError(
      typeof payload.error === 'string' ? payload.error : 'Something went wrong. Try again.',
      response.status,
      (payload.fieldErrors as Record<string, string>) ?? {},
    );
  }

  return payload as T;
}

const withBody = (method: string) => <T,>(path: string, body?: unknown) =>
  api<T>(path, { method, body: body === undefined ? undefined : JSON.stringify(body) });

export const get = <T,>(path: string) => api<T>(path);
export const post = withBody('POST');
export const patch = withBody('PATCH');
export const put = withBody('PUT');
export const del = <T,>(path: string) => api<T>(path, { method: 'DELETE' });

/** Builds `?a=1&b=2`, dropping empty values so the query string stays tidy. */
export const query = (params: Record<string, string | number | undefined | null>): string => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
};

/** Streams a CSV export straight to the browser's download list. */
export const downloadCsv = async (path: string, filename: string): Promise<void> => {
  const token = getToken();
  const response = await fetch(`${API_BASE}${path}`, { headers: token ? { authorization: `Bearer ${token}` } : {} });
  if (!response.ok) throw new ApiError('The export could not be generated.', response.status);

  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
