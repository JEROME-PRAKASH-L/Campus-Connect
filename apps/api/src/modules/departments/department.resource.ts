import { departmentCreateSchema, departmentUpdateSchema } from '@campus-connect/contracts';
import { prisma } from '../../database/prisma.js';
import { assertDepartmentAccess } from '../../middleware/authorization.middleware.js';
import type { ResourceDefinition, ResourceRow } from '../../shared/resource/resource.types.js';

export const departmentResource: ResourceDefinition = {
  name: 'departments',
  entity: 'Department',
  module: 'departments',
  delegate: () => prisma.department,
  createSchema: departmentCreateSchema,
  updateSchema: departmentUpdateSchema,
  searchFields: ['code', 'name', 'block', 'hodName'],
  sortFields: ['code', 'name', 'studentCount', 'facultyCount', 'avgAttendance', 'passPercentage', 'createdAt'],
  defaultSort: 'code',
  readPermission: 'department:read',
  writePermission: 'department:write',
  include: { hodUser: { select: { id: true, name: true } } },
  // An HOD may only edit the department they head; an administrator sees them all.
  assertAccess: (req, row) => {
    if (req.user?.role === 'HOD') assertDepartmentAccess(req, row.id as string);
  },
  toCreateData: (input) => ({
    code: input.code,
    name: input.name,
    block: input.block ?? '',
    hodName: input.hodName ?? '',
    hodUserId: input.hodUserId || null,
    facultyCount: 0,
    studentCount: 0,
    avgAttendance: 0,
    passPercentage: 0,
  }),
  toUpdateData: (input) => {
    const data: ResourceRow = {};
    for (const key of ['code', 'name', 'block', 'hodName'] as const) {
      if (input[key] !== undefined) data[key] = input[key];
    }
    if (input.hodUserId !== undefined) data.hodUserId = input.hodUserId || null;
    return data;
  },
  serialize: (row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    block: row.block,
    hodName: row.hodName,
    hodUserId: row.hodUserId ?? '',
    hodUserName: row.hodUser?.name ?? null,
    facultyCount: row.facultyCount,
    studentCount: row.studentCount,
    avgAttendance: row.avgAttendance,
    passPercentage: row.passPercentage,
    status: row.status,
    archivedAt: row.archivedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }),
  csvColumns: [
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Department' },
    { key: 'block', label: 'Block' },
    { key: 'hodName', label: 'Head of department' },
    { key: 'studentCount', label: 'Students' },
    { key: 'facultyCount', label: 'Faculty' },
    { key: 'avgAttendance', label: 'Avg attendance %' },
    { key: 'passPercentage', label: 'Pass %' },
    { key: 'status', label: 'Status' },
  ],
};
