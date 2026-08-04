import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { env } from './env.js';

export type TokenPayload = {
  sub: string;
  loginId: string;
  role: Role;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export const signToken = (payload: TokenPayload): string =>
  jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiry } as jwt.SignOptions);

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  try {
    req.user = jwt.verify(header.slice(7), env.jwtSecret) as TokenPayload;
    next();
  } catch {
    res.status(401).json({ error: 'Session expired. Sign in again.' });
  }
};

export const requireRole =
  (...roles: Role[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'You do not have access to this resource.' });
      return;
    }
    next();
  };
