import type { AuditAction, Prisma } from '@prisma/client';

export type AuditContext = {
  userId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
};

export type AuditInput = {
  action: AuditAction;
  module: string;
  entityType: string;
  entityId?: string | null;
  oldValues?: unknown;
  newValues?: unknown;
  /** Names the actor when the request is not yet authenticated — sign-in, for one. */
  actorId?: string | null;
};

export type AuditWriteArgs = AuditInput & AuditContext;

/** A Prisma client or an interactive-transaction client — audit writes accept either. */
export type AuditDb = Pick<Prisma.TransactionClient, 'auditLog'>;
