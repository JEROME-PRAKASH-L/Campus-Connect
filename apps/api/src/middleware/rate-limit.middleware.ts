import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

const message = { error: 'Too many requests. Wait a moment and try again.' };

/** Broad ceiling so a single client cannot saturate the service. */
export const apiRateLimit = rateLimit({
  windowMs: env.rateLimit.apiWindowMs,
  limit: env.rateLimit.apiMax,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message,
});

/**
 * Tight limit on credential endpoints. Keyed by IP *and* the identifier being
 * tried, so one attacker cannot lock every account behind a shared NAT, and a
 * single account cannot be brute-forced from one address.
 */
export const loginRateLimit = rateLimit({
  windowMs: env.rateLimit.loginWindowMs,
  limit: env.rateLimit.loginMax,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: 'Too many sign-in attempts. Try again in a few minutes.' },
  keyGenerator: (req) => {
    const body = req.body as { loginId?: unknown } | undefined;
    const identifier = typeof body?.loginId === 'string' ? body.loginId.trim().toLowerCase() : '';
    return `${req.ip ?? 'unknown'}|${identifier}`;
  },
});
