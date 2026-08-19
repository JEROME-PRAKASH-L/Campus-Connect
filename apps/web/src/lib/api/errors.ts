export class ApiError extends Error {
  readonly status: number;
  /** Per-field messages from the server's Zod validation, keyed by dotted path. */
  readonly fieldErrors: Record<string, string>;

  constructor(message: string, status: number, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }

  get isUnauthorized() {
    return this.status === 401;
  }

  get isForbidden() {
    return this.status === 403;
  }

  get isConflict() {
    return this.status === 409;
  }
}

export const messageFrom = (error: unknown, fallback = 'Something went wrong. Try again.'): string =>
  error instanceof Error && error.message ? error.message : fallback;

export const fieldErrorsFrom = (error: unknown): Record<string, string> => (error instanceof ApiError ? error.fieldErrors : {});
