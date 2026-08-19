import type { Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma.js';
import type { AuditDb, AuditWriteArgs } from './audit.types.js';

/** Values are stored as JSON; anything unserialisable is dropped rather than thrown. */
const asJson = (value: unknown): Prisma.InputJsonValue | undefined => {
  if (value === undefined || value === null) return undefined;
  try {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  } catch {
    return undefined;
  }
};

export const insertAudit = (args: AuditWriteArgs, db: AuditDb = prisma) =>
  db.auditLog.create({
    data: {
      action: args.action,
      module: args.module,
      entityType: args.entityType,
      entityId: args.entityId ?? null,
      oldValues: asJson(args.oldValues),
      newValues: asJson(args.newValues),
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      userId: args.userId,
    },
  });

export type AuditFilter = {
  module?: string;
  entityType?: string;
  entityId?: string;
  userId?: string;
  skip: number;
  take: number;
};

export const findAudits = async (filter: AuditFilter) => {
  const where: Prisma.AuditLogWhereInput = {
    ...(filter.module ? { module: filter.module } : {}),
    ...(filter.entityType ? { entityType: filter.entityType } : {}),
    ...(filter.entityId ? { entityId: filter.entityId } : {}),
    ...(filter.userId ? { userId: filter.userId } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({ where, include: { user: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, skip: filter.skip, take: filter.take }),
    prisma.auditLog.count({ where }),
  ]);
  return { rows, total };
};
