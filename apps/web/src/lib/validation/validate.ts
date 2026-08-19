import type { ZodTypeAny } from 'zod';

export type ValidationResult<T> = { ok: true; data: T } | { ok: false; message: string; fieldErrors: Record<string, string> };

/**
 * Runs a shared contract schema in the browser and flattens the issues into the
 * `{ path: message }` shape the form components render — the same shape the API
 * returns, so client-side and server-side rejections are handled identically.
 */
export const validateWith = <T>(schema: ZodTypeAny, value: unknown): ValidationResult<T> => {
  const result = schema.safeParse(value);
  if (result.success) return { ok: true, data: result.data as T };

  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join('.') || '_';
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }

  return { ok: false, message: result.error.issues[0]?.message ?? 'Check the highlighted fields.', fieldErrors };
};
