/** An error carrying the status code the client should see. */
export class HttpError extends Error {
  readonly status: number;
  readonly fieldErrors?: Record<string, string>;

  constructor(status: number, message: string, fieldErrors?: Record<string, string>) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export const badRequest = (message: string, fieldErrors?: Record<string, string>) => new HttpError(400, message, fieldErrors);
export const unauthorized = (message = 'Authentication required') => new HttpError(401, message);
export const forbidden = (message = 'You do not have access to this resource.') => new HttpError(403, message);
export const notFound = (message = 'Not found') => new HttpError(404, message);
export const conflict = (message: string) => new HttpError(409, message);
export const unprocessable = (message: string, fieldErrors?: Record<string, string>) => new HttpError(422, message, fieldErrors);

export const isHttpError = (error: unknown): error is HttpError => error instanceof HttpError;
