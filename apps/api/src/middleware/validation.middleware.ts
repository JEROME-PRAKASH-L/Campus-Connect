import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError, type ZodTypeAny, type z } from 'zod';
import { badRequest } from '../shared/errors/http-error.js';

export const fieldErrorsFrom = (error: ZodError): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
};

const firstMessage = (error: ZodError) => error.issues[0]?.message ?? 'The request could not be validated.';

type Source = 'body' | 'query' | 'params';

/**
 * Parses one part of the request with a Zod schema and parks the result on
 * `req.validated`. Because every master-data schema is `.strict()`, unknown keys
 * are rejected here rather than being spread into a Prisma `data` argument —
 * that is the mass-assignment guard.
 */
export const validate =
  <S extends ZodTypeAny>(schema: S, source: Source = 'body'): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      next(badRequest(firstMessage(result.error), fieldErrorsFrom(result.error)));
      return;
    }
    req.validated = result.data;
    next();
  };

/** Reads back what `validate` stored, typed to the schema that produced it. */
export const validated = <S extends ZodTypeAny>(req: Request, _schema?: S): z.infer<S> => req.validated as z.infer<S>;

/** One-off parse for a payload that is not the whole request body. */
export const parseOrThrow = <S extends ZodTypeAny>(schema: S, value: unknown): z.infer<S> => {
  const result = schema.safeParse(value);
  if (!result.success) throw badRequest(firstMessage(result.error), fieldErrorsFrom(result.error));
  return result.data;
};
