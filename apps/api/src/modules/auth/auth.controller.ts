import type { Request, Response } from 'express';
import { validated } from '../../middleware/validation.middleware.js';
import { recordAudit } from '../audit/audit.service.js';
import { authenticate, changePassword, demoAccounts, meFor } from './auth.service.js';
import type { changePasswordSchema, loginSchema } from './auth.schema.js';

export const postLogin = async (req: Request, res: Response) => {
  const input = validated<typeof loginSchema>(req);
  const result = await authenticate(input.loginId, input.password);
  // The request is anonymous at this point, so the actor is named explicitly.
  await recordAudit(req, { action: 'LOGIN', module: 'auth', entityType: 'User', entityId: result.user.id, actorId: result.user.id });
  res.json(result);
};

export const getMe = async (req: Request, res: Response) => {
  res.json({ user: await meFor(req.user!.sub) });
};

export const getDemoAccounts = async (_req: Request, res: Response) => {
  res.json({ accounts: await demoAccounts() });
};

export const postChangePassword = async (req: Request, res: Response) => {
  const input = validated<typeof changePasswordSchema>(req);
  await changePassword(req.user!.sub, input.currentPassword, input.newPassword);
  await recordAudit(req, { action: 'PASSWORD', module: 'auth', entityType: 'User', entityId: req.user!.sub });
  res.json({ ok: true });
};
