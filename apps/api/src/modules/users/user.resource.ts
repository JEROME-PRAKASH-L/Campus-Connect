import { userCreateSchema, userUpdateSchema } from '@campus-connect/contracts';
import { prisma } from '../../database/prisma.js';
import { badRequest } from '../../shared/errors/http-error.js';
import { generateLoginId, initialsFor, initialPasswordHash, roleLabelFor } from '../../shared/utils/identity.js';
import type { ResourceDefinition, ResourceRow } from '../../shared/resource/resource.types.js';

const LOGIN_PREFIX: Record<string, string> = { STUDENT: 'STU', FACULTY: 'FAC', HOD: 'HOD', ADMIN: 'ADM', PARENT: 'PAR' };

const departmentIdFor = async (code: string | undefined) => {
  if (!code) return null;
  const department = await prisma.department.findUnique({ where: { code: code.toUpperCase() }, select: { id: true } });
  if (!department) throw badRequest('Unknown department.');
  return department.id;
};

/**
 * Accounts and role assignment. Creating a student, faculty member or parent
 * through their own resource is preferred — those build the profile row too —
 * but administrators need a way to mint and re-role a bare login.
 */
export const userResource: ResourceDefinition = {
  name: 'users',
  entity: 'User',
  module: 'users',
  delegate: () => prisma.user,
  createSchema: userCreateSchema,
  updateSchema: userUpdateSchema,
  searchFields: ['name', 'email', 'loginId'],
  sortFields: ['loginId', 'name', 'role', 'createdAt'],
  defaultSort: 'loginId',
  filters: [
    { key: 'role', where: (value) => ({ role: value }) },
    { key: 'departmentId', where: (value) => ({ departmentId: value }) },
  ],
  include: { department: { select: { code: true, name: true } } },
  readPermission: 'user:read',
  writePermission: 'user:write',
  toCreateData: async (input) => {
    const departmentId = await departmentIdFor(input.departmentCode as string | undefined);
    const role = input.role as string;
    return {
      loginId: generateLoginId(LOGIN_PREFIX[role] ?? 'USR'),
      email: input.email,
      passwordHash: await initialPasswordHash(),
      name: input.name,
      role,
      initials: initialsFor(input.name as string),
      roleLabel: roleLabelFor(role as never),
      extra: input.extra ?? '',
      departmentId,
    };
  },
  toUpdateData: async (input) => {
    const data: ResourceRow = {};
    if (input.name !== undefined) {
      data.name = input.name;
      data.initials = initialsFor(input.name as string);
    }
    if (input.email !== undefined) data.email = input.email;
    if (input.extra !== undefined) data.extra = input.extra;
    if (input.role !== undefined) {
      data.role = input.role;
      data.roleLabel = roleLabelFor(input.role as never);
    }
    if (input.departmentCode !== undefined) data.departmentId = await departmentIdFor(input.departmentCode as string);
    return data;
  },
  serialize: (row) => ({
    id: row.id,
    loginId: row.loginId,
    name: row.name,
    email: row.email,
    role: row.role,
    roleLabel: row.roleLabel,
    extra: row.extra,
    departmentCode: row.department?.code ?? '',
    department: row.department?.name ?? '—',
    status: row.status,
    archivedAt: row.archivedAt,
    createdAt: row.createdAt,
  }),
  csvColumns: [
    { key: 'loginId', label: 'Login ID' },
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'roleLabel', label: 'Role' },
    { key: 'department', label: 'Department' },
    { key: 'status', label: 'Status' },
  ],
};
