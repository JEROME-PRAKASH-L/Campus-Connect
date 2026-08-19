import { feeCategoryCreateSchema, feeCategoryUpdateSchema } from '@campus-connect/contracts';
import { prisma } from '../../database/prisma.js';
import type { ResourceDefinition } from '../../shared/resource/resource.types.js';

export const feeCategoryResource: ResourceDefinition = {
  name: 'fee-categories',
  entity: 'Fee category',
  module: 'fees',
  delegate: () => prisma.feeCategory,
  createSchema: feeCategoryCreateSchema,
  updateSchema: feeCategoryUpdateSchema,
  searchFields: ['code', 'name', 'description'],
  sortFields: ['code', 'name', 'defaultAmount', 'academicYear', 'createdAt'],
  defaultSort: 'code',
  filters: [{ key: 'academicYear', where: (value) => ({ academicYear: value }) }],
  include: { _count: { select: { fees: true } } },
  readPermission: 'fee:read',
  writePermission: 'fee:write',
  serialize: (row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    defaultAmount: row.defaultAmount,
    academicYear: row.academicYear,
    description: row.description,
    assignments: row._count?.fees ?? 0,
    status: row.status,
    archivedAt: row.archivedAt,
  }),
  csvColumns: [
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Category' },
    { key: 'defaultAmount', label: 'Default amount' },
    { key: 'academicYear', label: 'Academic year' },
    { key: 'assignments', label: 'Assignments' },
    { key: 'status', label: 'Status' },
  ],
};
