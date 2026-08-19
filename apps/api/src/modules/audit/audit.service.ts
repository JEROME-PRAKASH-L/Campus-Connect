import type { Request } from 'express';
import type { AuditEntry } from '@campus-connect/contracts';
import { findAudits, insertAudit, type AuditFilter } from './audit.repository.js';
import type { AuditContext, AuditDb, AuditInput } from './audit.types.js';

/** Pulls the actor and client details off the request. Never trusts the body. */
export const auditContextFrom = (req: Request): AuditContext => ({
  userId: req.user?.sub ?? null,
  ipAddress: req.ip ?? null,
  userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'].slice(0, 400) : null,
});

/**
 * Writes one audit row. Pass a transaction client to make the trail atomic with
 * the change it describes; without one the write is best-effort and a failure is
 * logged rather than propagated, so auditing can never break a user's action.
 */
export const recordAudit = async (req: Request, input: AuditInput, db?: AuditDb): Promise<void> => {
  const context = auditContextFrom(req);
  const args = { ...input, ...context, userId: input.actorId ?? context.userId };
  if (db) {
    await insertAudit(args, db);
    return;
  }
  try {
    await insertAudit(args);
  } catch (error) {
    console.error('[audit] failed to record', input.module, input.action, error);
  }
};

export const listAudits = async (filter: AuditFilter): Promise<{ entries: AuditEntry[]; total: number }> => {
  const { rows, total } = await findAudits(filter);
  return {
    total,
    entries: rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      userName: row.user?.name ?? null,
      action: row.action,
      module: row.module,
      entityType: row.entityType,
      entityId: row.entityId,
      oldValues: row.oldValues,
      newValues: row.newValues,
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
      createdAt: row.createdAt.toISOString(),
    })),
  };
};
