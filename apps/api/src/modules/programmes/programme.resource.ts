import { programmeCreateSchema, programmeUpdateSchema } from '@campus-connect/contracts';
import { prisma } from '../../database/prisma.js';
import { assertDepartmentAccess, departmentWhere } from '../../middleware/authorization.middleware.js';
import type { ResourceDefinition } from '../../shared/resource/resource.types.js';

export const programmeResource: ResourceDefinition = {
  name: 'programmes',
  entity: 'Programme',
  module: 'programmes',
  delegate: () => prisma.course,
  createSchema: programmeCreateSchema,
  updateSchema: programmeUpdateSchema,
  searchFields: ['code', 'name', 'degree'],
  sortFields: ['code', 'name', 'degree', 'durationYears', 'createdAt'],
  defaultSort: 'code',
  filters: [{ key: 'departmentId', where: (value) => ({ departmentId: value }) }],
  include: { department: { select: { id: true, code: true, name: true } } },
  readPermission: 'programme:read',
  writePermission: 'programme:write',
  scope: (req) => departmentWhere(req),
  assertAccess: (req, row) => assertDepartmentAccess(req, row.departmentId as string),
  serialize: (row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    degree: row.degree,
    durationYears: row.durationYears,
    departmentId: row.departmentId,
    department: row.department?.code ?? '—',
    status: row.status,
    archivedAt: row.archivedAt,
    createdAt: row.createdAt,
  }),
  csvColumns: [
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Programme' },
    { key: 'degree', label: 'Degree' },
    { key: 'durationYears', label: 'Years' },
    { key: 'department', label: 'Department' },
    { key: 'status', label: 'Status' },
  ],
};
