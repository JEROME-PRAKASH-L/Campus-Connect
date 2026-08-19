import type { NextFunction, Request, Response } from 'express';
import { auditContextFrom } from '../modules/audit/audit.service.js';

/**
 * Stamps the resolved audit context onto the response locals so any handler —
 * including ones that bail out early — can reach the actor, IP and user agent
 * without re-deriving them.
 */
export const auditMiddleware = (req: Request, res: Response, next: NextFunction) => {
  res.locals.audit = auditContextFrom(req);
  next();
};
