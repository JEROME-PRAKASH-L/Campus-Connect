import { academicYearCreateSchema, academicYearUpdateSchema } from '@campus-connect/contracts';
import { prisma } from '../../database/prisma.js';
import type { ResourceDefinition } from '../../shared/resource/resource.types.js';

/**
 * A `Semester` row is one numbered semester inside one academic year — the two
 * together are the academic calendar the rest of the portal hangs off. Exactly
 * one row may be `isCurrent`; setting a new one clears the previous.
 */
export const academicYearResource: ResourceDefinition = {
  name: 'academic-years',
  entity: 'Semester',
  module: 'academic-years',
  delegate: () => prisma.semester,
  createSchema: academicYearCreateSchema,
  updateSchema: academicYearUpdateSchema,
  searchFields: ['label', 'academicYear'],
  sortFields: ['number', 'label', 'academicYear', 'createdAt'],
  defaultSort: 'number',
  filters: [{ key: 'academicYear', where: (value) => ({ academicYear: value }) }],
  readPermission: 'academic-year:read',
  writePermission: 'academic-year:write',
  toCreateData: async (input) => {
    if (input.isCurrent) await prisma.semester.updateMany({ where: { isCurrent: true }, data: { isCurrent: false } });
    return input;
  },
  toUpdateData: async (input, _req, existing) => {
    if (input.isCurrent) await prisma.semester.updateMany({ where: { isCurrent: true, NOT: { id: existing.id } }, data: { isCurrent: false } });
    return input;
  },
  serialize: (row) => ({
    id: row.id,
    number: row.number,
    label: row.label,
    academicYear: row.academicYear,
    isCurrent: row.isCurrent,
    status: row.status,
    archivedAt: row.archivedAt,
  }),
  csvColumns: [
    { key: 'number', label: 'Semester' },
    { key: 'label', label: 'Label' },
    { key: 'academicYear', label: 'Academic year' },
    { key: 'isCurrent', label: 'Current' },
    { key: 'status', label: 'Status' },
  ],
};
