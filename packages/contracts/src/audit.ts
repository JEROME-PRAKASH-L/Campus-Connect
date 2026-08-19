export const AUDIT_ACTIONS = ['CREATE', 'UPDATE', 'ARCHIVE', 'RESTORE', 'DELETE', 'APPROVE', 'REJECT', 'PAYMENT', 'MARKS', 'ATTENDANCE', 'LOGIN', 'PASSWORD'] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export type AuditEntry = {
  id: string;
  userId: string | null;
  userName: string | null;
  action: AuditAction;
  module: string;
  entityType: string;
  entityId: string | null;
  oldValues: unknown;
  newValues: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};
