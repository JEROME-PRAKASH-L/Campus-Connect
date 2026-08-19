/** The five roles the portal recognises. Mirrors the `Role` enum in the Prisma schema. */
export const ROLES = ['STUDENT', 'FACULTY', 'HOD', 'ADMIN', 'PARENT'] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  STUDENT: 'Student',
  FACULTY: 'Faculty',
  HOD: 'Head of Dept.',
  ADMIN: 'Administrator',
  PARENT: 'Parent',
};

export const isRole = (value: unknown): value is Role => typeof value === 'string' && (ROLES as readonly string[]).includes(value);

/** Roles that may act on institute-wide master data. */
export const STAFF_ROLES: Role[] = ['FACULTY', 'HOD', 'ADMIN'];

/** Roles whose requests are always resolved against a single student record. */
export const STUDENT_CONTEXT_ROLES: Role[] = ['STUDENT', 'PARENT'];
