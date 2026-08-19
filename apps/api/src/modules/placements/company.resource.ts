import { companyCreateSchema, companyUpdateSchema } from '@campus-connect/contracts';
import { prisma } from '../../database/prisma.js';
import type { ResourceDefinition } from '../../shared/resource/resource.types.js';

export const companyResource: ResourceDefinition = {
  name: 'companies',
  entity: 'Company',
  module: 'placements',
  delegate: () => prisma.company,
  createSchema: companyCreateSchema,
  updateSchema: companyUpdateSchema,
  searchFields: ['name', 'sector', 'contactName', 'contactEmail'],
  sortFields: ['name', 'sector', 'createdAt'],
  defaultSort: 'name',
  filters: [{ key: 'sector', where: (value) => ({ sector: value }) }],
  include: { _count: { select: { drives: true } } },
  readPermission: 'placement:read',
  writePermission: 'placement:write',
  serialize: (row) => ({
    id: row.id,
    name: row.name,
    sector: row.sector,
    website: row.website,
    contactName: row.contactName,
    contactEmail: row.contactEmail,
    contactPhone: row.contactPhone,
    drives: row._count?.drives ?? 0,
    status: row.status,
    archivedAt: row.archivedAt,
  }),
  csvColumns: [
    { key: 'name', label: 'Company' },
    { key: 'sector', label: 'Sector' },
    { key: 'contactName', label: 'Contact' },
    { key: 'contactEmail', label: 'Email' },
    { key: 'contactPhone', label: 'Phone' },
    { key: 'drives', label: 'Drives' },
    { key: 'status', label: 'Status' },
  ],
};
