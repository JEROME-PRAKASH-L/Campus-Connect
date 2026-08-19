import { examCreateSchema, examUpdateSchema } from '@campus-connect/contracts';
import { prisma } from '../../database/prisma.js';
import { assertDepartmentAccess, departmentScopeFor } from '../../middleware/authorization.middleware.js';
import type { ResourceDefinition } from '../../shared/resource/resource.types.js';

export const examResource: ResourceDefinition = {
  name: 'examinations',
  entity: 'Examination',
  module: 'examinations',
  delegate: () => prisma.exam,
  createSchema: examCreateSchema,
  updateSchema: examUpdateSchema,
  searchFields: ['title', 'hall', 'subject.code', 'subject.name'],
  sortFields: ['date', 'title', 'createdAt'],
  defaultSort: 'date',
  filters: [
    { key: 'subjectId', where: (value) => ({ subjectId: value }) },
    { key: 'session', where: (value) => ({ session: value }) },
  ],
  include: { subject: { select: { id: true, code: true, name: true, departmentId: true, semesterId: true } } },
  readPermission: 'examination:read',
  writePermission: 'examination:write',
  scope: (req) => {
    const scope = departmentScopeFor(req);
    return scope ? { subject: { departmentId: scope } } : {};
  },
  assertAccess: (req, row) => assertDepartmentAccess(req, row.subject?.departmentId as string),
  toCreateData: (input) => ({ ...input, hall: input.hall ?? '', seatNo: input.seatNo ?? '' }),
  serialize: (row) => ({
    id: row.id,
    title: row.title,
    subjectId: row.subjectId,
    code: row.subject?.code ?? '—',
    subject: row.subject?.name ?? '—',
    date: row.date,
    session: row.session,
    hall: row.hall,
    seatNo: row.seatNo,
    strength: row.strength,
    status: row.status,
    archivedAt: row.archivedAt,
  }),
  csvColumns: [
    { key: 'date', label: 'Date' },
    { key: 'session', label: 'Session' },
    { key: 'code', label: 'Code' },
    { key: 'subject', label: 'Subject' },
    { key: 'title', label: 'Examination' },
    { key: 'hall', label: 'Hall' },
    { key: 'strength', label: 'Strength' },
    { key: 'status', label: 'Status' },
  ],
};
