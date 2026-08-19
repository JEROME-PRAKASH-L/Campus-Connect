import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { unauthorized } from '../shared/errors/http-error.js';
import type { TokenPayload } from '../shared/types/express.js';

export type { TokenPayload };

export const signToken = (payload: TokenPayload): string =>
  jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiry } as jwt.SignOptions);

const readBearer = (req: Request): string | null => {
  const header = req.headers.authorization;
  return header?.startsWith('Bearer ') ? header.slice(7) : null;
};

/**
 * Establishes who is calling. Everything downstream reads identity from
 * `req.user` — never from the request body — so a client cannot claim a role,
 * a department or a student id it does not own.
 */
export const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
  const token = readBearer(req);
  if (!token) {
    next(unauthorized('Authentication required'));
    return;
  }
  try {
    req.user = jwt.verify(token, env.jwtSecret) as TokenPayload;
    next();
  } catch {
    next(unauthorized('Session expired. Sign in again.'));
  }
};

/** Attaches `req.user` when a valid token is present but never rejects. */
export const optionalAuth = (req: Request, _res: Response, next: NextFunction) => {
  const token = readBearer(req);
  if (token) {
    try {
      req.user = jwt.verify(token, env.jwtSecret) as TokenPayload;
    } catch {
      /* an unreadable token on an optional route is simply "not signed in" */
    }
  }
  next();
};

export const currentUser = (req: Request): TokenPayload => {
  if (!req.user) throw unauthorized();
  return req.user;
};
