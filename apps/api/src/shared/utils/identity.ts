import bcrypt from 'bcryptjs';
import type { Role } from '@prisma/client';
import { ROLE_LABELS } from '@campus-connect/contracts';
import { DEFAULT_PASSWORD } from '../constants/index.js';

export const initialsFor = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'DM';

export const roleLabelFor = (role: Role): string => ROLE_LABELS[role];

export const hashPassword = (plain: string) => bcrypt.hash(plain, 10);

export const comparePassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

/**
 * Accounts created through the portal start on the shared demo password. The
 * account holder is expected to change it at first sign-in; the endpoint that
 * does so is `POST /api/auth/change-password`.
 */
export const initialPasswordHash = () => hashPassword(DEFAULT_PASSWORD);

export const generateLoginId = (prefix: string): string => `${prefix}${Math.floor(Math.random() * 9000) + 1000}`;

/** Builds the `user.create` payload shared by the student, faculty and parent resources. */
export const userCreateInput = async (args: { name: string; email: string; role: Role; departmentId?: string | null; extra?: string; loginId: string }) => ({
  loginId: args.loginId.toUpperCase(),
  email: args.email.toLowerCase(),
  passwordHash: await initialPasswordHash(),
  name: args.name,
  role: args.role,
  initials: initialsFor(args.name),
  roleLabel: roleLabelFor(args.role),
  extra: args.extra ?? '',
  ...(args.departmentId ? { departmentId: args.departmentId } : {}),
});
