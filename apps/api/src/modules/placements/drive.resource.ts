import { placementDriveCreateSchema, placementDriveUpdateSchema } from '@campus-connect/contracts';
import { prisma } from '../../database/prisma.js';
import type { ResourceDefinition } from '../../shared/resource/resource.types.js';

export const placementDriveResource: ResourceDefinition = {
  name: 'placement-drives',
  entity: 'Placement drive',
  module: 'placements',
  delegate: () => prisma.placementDrive,
  createSchema: placementDriveCreateSchema,
  updateSchema: placementDriveUpdateSchema,
  searchFields: ['company', 'role', 'eligibility'],
  sortFields: ['driveDate', 'company', 'minCgpa', 'createdAt'],
  defaultSort: 'driveDate',
  filters: [{ key: 'companyId', where: (value) => ({ companyId: value }) }],
  include: { companyRef: { select: { id: true, name: true } }, _count: { select: { registrations: true } } },
  readPermission: 'placement:read',
  writePermission: 'placement:write',
  toCreateData: (input) => ({ ...input, eligibility: input.eligibility ?? '', companyId: input.companyId || null }),
  toUpdateData: (input) => ({ ...input, ...(input.companyId !== undefined ? { companyId: input.companyId || null } : {}) }),
  serialize: (row) => ({
    id: row.id,
    company: row.companyRef?.name ?? row.company,
    companyId: row.companyId ?? '',
    role: row.role,
    ctc: row.ctc,
    driveDate: row.driveDate,
    eligibility: row.eligibility,
    minCgpa: row.minCgpa,
    noArrears: row.noArrears,
    registrations: row._count?.registrations ?? 0,
    status: row.status,
    archivedAt: row.archivedAt,
  }),
  csvColumns: [
    { key: 'driveDate', label: 'Drive date' },
    { key: 'company', label: 'Company' },
    { key: 'role', label: 'Role' },
    { key: 'ctc', label: 'CTC' },
    { key: 'minCgpa', label: 'Min CGPA' },
    { key: 'registrations', label: 'Registered' },
    { key: 'status', label: 'Status' },
  ],
};
