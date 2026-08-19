import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { env } from '../config/env.js';
import { HttpError } from '../shared/errors/http-error.js';
import { fieldErrorsFrom } from './validation.middleware.js';

type Shaped = { status: number; message: string; fieldErrors?: Record<string, string> };

const shape = (error: unknown): Shaped => {
  if (error instanceof HttpError) {
    return { status: error.status, message: error.message, fieldErrors: error.fieldErrors };
  }
  if (error instanceof ZodError) {
    return { status: 400, message: error.issues[0]?.message ?? 'Invalid request.', fieldErrors: fieldErrorsFrom(error) };
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // P2002 unique constraint, P2003 foreign key, P2025 record not found.
    if (error.code === 'P2002') {
      const target = Array.isArray(error.meta?.target) ? (error.meta.target as string[]).join(', ') : 'value';
      return { status: 409, message: `A record with that ${target} already exists.` };
    }
    if (error.code === 'P2003') return { status: 400, message: 'That change references a record that does not exist.' };
    if (error.code === 'P2025') return { status: 404, message: 'Record not found.' };
  }
  // Anything unrecognised is a bug: report it as a 500 and never leak internals.
  return { status: 500, message: 'Something went wrong on the server.' };
};

/** The single exit point for failures. Mounted last so every route reaches it. */
export const errorMiddleware = (error: unknown, req: Request, res: Response, _next: NextFunction) => {
  const { status, message, fieldErrors } = shape(error);

  if (status >= 500) {
    console.error(`[api] ${req.method} ${req.originalUrl} →`, error);
  } else if (!env.isProduction) {
    console.warn(`[api] ${req.method} ${req.originalUrl} → ${status} ${message}`);
  }

  res.status(status).json(fieldErrors ? { error: message, fieldErrors } : { error: message });
};
