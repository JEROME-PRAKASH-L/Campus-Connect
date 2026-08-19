import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@prisma/client';
import { can, type Permission } from '@campus-connect/contracts';
import { forbidden, unauthorized } from '../shared/errors/http-error.js';

/** Role gate. Kept for the routes that were written against it. */
export const requireRole =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(unauthorized());
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(forbidden());
      return;
    }
    next();
  };

/**
 * Permission gate, resolved against the shared role/permission matrix in
 * `@campus-connect/contracts` — the same table the web app uses to decide what
 * to render, so the button and the endpoint can never disagree.
 */
export const requirePermission =
  (...permissions: Permission[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(unauthorized());
      return;
    }
    const granted = permissions.every((p) => can(req.user!.role, p));
    if (!granted) {
      next(forbidden(`Your role does not include ${permissions.join(', ')}.`));
      return;
    }
    next();
  };

/**
 * Department scope for the calling account.
 *
 * An administrator sees the whole institute (`null`). Everyone else is pinned to
 * the department on their JWT, so an HOD cannot widen their reach by sending a
 * different `departmentId` in the query string.
 */
export const departmentScopeFor = (req: Request): string | null => {
  const user = req.user;
  if (!user) throw unauthorized();
  if (user.role === 'ADMIN') return null;
  return user.departmentId ?? null;
};

/** Throws unless the caller is allowed to act on records in `departmentId`. */
export const assertDepartmentAccess = (req: Request, departmentId: string | null | undefined) => {
  const scope = departmentScopeFor(req);
  if (scope === null) return;
  if (!departmentId || departmentId !== scope) {
    throw forbidden('That record belongs to another department.');
  }
};

/** A Prisma `where` fragment that limits a query to the caller's department. */
export const departmentWhere = (req: Request, column = 'departmentId'): Record<string, string> => {
  const scope = departmentScopeFor(req);
  return scope ? { [column]: scope } : {};
};
