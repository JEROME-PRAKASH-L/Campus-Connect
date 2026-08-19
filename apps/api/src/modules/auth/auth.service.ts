import type { Role } from '@prisma/client';
import type { SessionUser } from '@campus-connect/contracts';
import { prisma } from '../../database/prisma.js';
import { badRequest, forbidden, notFound, unauthorized } from '../../shared/errors/http-error.js';
import { comparePassword, hashPassword } from '../../shared/utils/identity.js';
import { DEMO_LOGIN_IDS } from '../../shared/constants/index.js';
import { signToken } from '../../middleware/authentication.middleware.js';

type UserWithDepartment = {
  id: string;
  loginId: string;
  name: string;
  email: string;
  role: Role;
  initials: string;
  roleLabel: string;
  extra: string;
  departmentId: string | null;
  department: { code: string; name: string } | null;
};

/** The only shape of a user that ever leaves the API — no hash, no internals. */
export const publicUser = (user: UserWithDepartment): SessionUser => ({
  id: user.id,
  loginId: user.loginId,
  name: user.name,
  email: user.email,
  role: user.role,
  initials: user.initials,
  roleLabel: user.roleLabel,
  extra: user.extra,
  department: user.department?.code ?? '—',
  departmentName: user.department?.name ?? '—',
  departmentId: user.departmentId,
});

export const authenticate = async (identifier: string, password: string) => {
  const trimmed = identifier.trim();
  const user = await prisma.user.findFirst({
    where: { OR: [{ loginId: trimmed.toUpperCase() }, { email: trimmed.toLowerCase() }] },
    include: { department: true },
  });

  if (!user) throw unauthorized('No account found for that register number or staff ID.');
  if (!(await comparePassword(password, user.passwordHash))) throw unauthorized('Incorrect password. Demo accounts use demo1234.');
  if (user.status === 'ARCHIVED') throw forbidden('That account has been archived. Contact the administration office.');

  // The department is baked into the token so every later request derives scope
  // from a signed claim rather than anything the browser sends.
  const token = signToken({ sub: user.id, loginId: user.loginId, role: user.role, departmentId: user.departmentId });
  return { token, user: publicUser(user) };
};

export const meFor = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { department: true } });
  if (!user) throw notFound('Account no longer exists.');
  return publicUser(user);
};

export const demoAccounts = async () => {
  const users = await prisma.user.findMany({ where: { loginId: { in: [...DEMO_LOGIN_IDS] } }, include: { department: true } });
  const order: Role[] = ['STUDENT', 'FACULTY', 'HOD', 'ADMIN', 'PARENT'];
  return users
    .sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role))
    .map((u) => ({ role: u.role, roleLabel: u.roleLabel, name: u.name, loginId: u.loginId }));
};

export const changePassword = async (userId: string, currentPassword: string, newPassword: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !(await comparePassword(currentPassword, user.passwordHash))) throw badRequest('Current password is incorrect.');
  if (await comparePassword(newPassword, user.passwordHash)) throw badRequest('Choose a password you have not used before.');
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(newPassword), updatedById: user.id } });
};
