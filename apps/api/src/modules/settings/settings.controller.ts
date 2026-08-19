import type { Request, Response } from 'express';
import type { Prisma } from '@prisma/client';
import { institutionSchema } from '@campus-connect/contracts';
import { validated } from '../../middleware/validation.middleware.js';
import { recordAudit } from '../audit/audit.service.js';
import { DEFAULT_INSTITUTION, INSTITUTION_KEY, listSettings, readSetting, writeSetting } from './settings.service.js';

export const getInstitution = async (_req: Request, res: Response) => {
  res.json({ institution: await readSetting(INSTITUTION_KEY, DEFAULT_INSTITUTION) });
};

export const putInstitution = async (req: Request, res: Response) => {
  const input = validated<typeof institutionSchema>(req);
  const { previous, current } = await writeSetting(INSTITUTION_KEY, input as unknown as Prisma.InputJsonValue, req.user!.sub, 'INSTITUTION');
  await recordAudit(req, { action: 'UPDATE', module: 'settings', entityType: 'Institution', entityId: INSTITUTION_KEY, oldValues: previous, newValues: current });
  res.json({ institution: current });
};

export const getSettings = async (_req: Request, res: Response) => {
  res.json({ settings: await listSettings() });
};
