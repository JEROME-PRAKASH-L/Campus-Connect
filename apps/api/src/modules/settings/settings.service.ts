import type { Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma.js';

export const INSTITUTION_KEY = 'institution.profile';

export const DEFAULT_INSTITUTION = {
  name: 'DMI College of Engineering',
  shortName: 'DMI',
  affiliation: 'Affiliated to Anna University',
  addressLine1: '',
  addressLine2: '',
  city: 'Chennai',
  state: 'Tamil Nadu',
  postalCode: '',
  phone: '',
  email: '',
  website: '',
  logoFileId: '',
};

export const readSetting = async <T>(key: string, fallback: T): Promise<T> => {
  const row = await prisma.setting.findUnique({ where: { key } });
  return row ? ({ ...fallback, ...(row.value as object) } as T) : fallback;
};

export const writeSetting = async (key: string, value: Prisma.InputJsonValue, userId: string, scope = 'SYSTEM') => {
  const existing = await prisma.setting.findUnique({ where: { key } });
  const row = await prisma.setting.upsert({
    where: { key },
    create: { key, value, scope, updatedById: userId },
    update: { value, updatedById: userId },
  });
  return { previous: existing?.value ?? null, current: row.value };
};

export const listSettings = async () => {
  const rows = await prisma.setting.findMany({ orderBy: { key: 'asc' } });
  return rows.map((row) => ({ key: row.key, value: row.value, scope: row.scope, updatedAt: row.updatedAt.toISOString() }));
};
