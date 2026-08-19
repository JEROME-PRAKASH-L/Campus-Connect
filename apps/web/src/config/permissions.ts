import { ROLE_PERMISSIONS, can, permissionCount, type Permission, type Role } from '@campus-connect/contracts';

/**
 * The web app never invents its own access rules. It reads the same matrix the
 * API enforces, so a button is shown exactly when the endpoint behind it would
 * succeed — and hiding a control is presentation, not protection: the server
 * checks again on every request.
 */
export { ROLE_PERMISSIONS, can, permissionCount };
export type { Permission, Role };

export const canAll = (role: Role, ...permissions: Permission[]): boolean => permissions.every((p) => can(role, p));

export const canAny = (role: Role, ...permissions: Permission[]): boolean => permissions.some((p) => can(role, p));

/** Copy for the "you cannot do this" notice, so the wording is consistent. */
export const deniedMessage = (action: string): string => `Your role does not include permission to ${action}.`;
