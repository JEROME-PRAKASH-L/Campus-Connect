import { parentCreateSchema, parentUpdateSchema } from '@campus-connect/contracts';
import { prisma } from '../../database/prisma.js';
import { assertDepartmentAccess } from '../../middleware/authorization.middleware.js';
import { departmentScopeFor } from '../../middleware/authorization.middleware.js';
import { badRequest } from '../../shared/errors/http-error.js';
import { generateLoginId, userCreateInput } from '../../shared/utils/identity.js';
import type { ResourceDefinition, ResourceRow } from '../../shared/resource/resource.types.js';

export const parentResource: ResourceDefinition = {
  name: 'parents',
  entity: 'Parent',
  module: 'parents',
  delegate: () => prisma.parent,
  createSchema: parentCreateSchema,
  updateSchema: parentUpdateSchema,
  searchFields: ['relation', 'mobile', 'user.name', 'user.email', 'ward.registerNumber'],
  sortFields: ['relation', 'createdAt'],
  defaultSort: 'createdAt',
  defaultDirection: 'desc',
  filters: [{ key: 'wardId', where: (value) => ({ wardId: value }) }],
  include: {
    user: { select: { id: true, name: true, email: true, loginId: true } },
    ward: { select: { id: true, registerNumber: true, departmentId: true, user: { select: { name: true } } } },
  },
  readPermission: 'parent:read',
  writePermission: 'parent:write',
  scope: (req) => {
    const scope = departmentScopeFor(req);
    return scope ? { ward: { departmentId: scope } } : {};
  },
  assertAccess: (req, row) => assertDepartmentAccess(req, row.ward?.departmentId as string),
  toCreateData: async (input) => {
    const ward = await prisma.student.findUnique({ where: { id: input.wardId as string }, select: { departmentId: true, registerNumber: true } });
    if (!ward) throw badRequest('Unknown ward.');
    return {
      relation: input.relation,
      mobile: input.mobile,
      wardId: input.wardId,
      user: {
        create: await userCreateInput({
          name: input.name as string,
          email: input.email as string,
          role: 'PARENT',
          departmentId: ward.departmentId,
          extra: `Guardian of ${ward.registerNumber}`,
          loginId: generateLoginId('PAR'),
        }),
      },
    };
  },
  toUpdateData: (input) => {
    const data: ResourceRow = {};
    if (input.relation !== undefined) data.relation = input.relation;
    if (input.mobile !== undefined) data.mobile = input.mobile;
    if (input.wardId !== undefined) data.wardId = input.wardId;
    const user: ResourceRow = {};
    if (input.name !== undefined) user.name = input.name;
    if (input.email !== undefined) user.email = input.email;
    if (Object.keys(user).length) data.user = { update: user };
    return data;
  },
  serialize: (row) => ({
    id: row.id,
    name: row.user?.name ?? '—',
    email: row.user?.email ?? '—',
    loginId: row.user?.loginId ?? '—',
    relation: row.relation,
    mobile: row.mobile,
    wardId: row.wardId,
    ward: row.ward?.user?.name ?? '—',
    wardRegisterNumber: row.ward?.registerNumber ?? '—',
    status: row.status,
    archivedAt: row.archivedAt,
  }),
  csvColumns: [
    { key: 'name', label: 'Guardian' },
    { key: 'relation', label: 'Relation' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'email', label: 'Email' },
    { key: 'ward', label: 'Ward' },
    { key: 'wardRegisterNumber', label: 'Register number' },
    { key: 'status', label: 'Status' },
  ],
};
