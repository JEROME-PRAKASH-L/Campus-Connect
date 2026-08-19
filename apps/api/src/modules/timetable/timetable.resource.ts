import { timetableEntryCreateSchema, timetableEntryUpdateSchema } from '@campus-connect/contracts';
import { prisma } from '../../database/prisma.js';
import { assertDepartmentAccess, departmentScopeFor } from '../../middleware/authorization.middleware.js';
import type { ResourceDefinition } from '../../shared/resource/resource.types.js';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const timetableResource: ResourceDefinition = {
  name: 'timetable',
  entity: 'Timetable entry',
  module: 'timetable',
  delegate: () => prisma.timetableEntry,
  createSchema: timetableEntryCreateSchema,
  updateSchema: timetableEntryUpdateSchema,
  searchFields: ['room', 'label', 'subject.code', 'subject.name'],
  sortFields: ['dayOfWeek', 'period', 'createdAt'],
  defaultSort: 'dayOfWeek',
  filters: [
    { key: 'sectionId', where: (value) => ({ sectionId: value }) },
    { key: 'semesterId', where: (value) => ({ semesterId: value }) },
    { key: 'facultyId', where: (value) => ({ facultyId: value }) },
    { key: 'dayOfWeek', where: (value) => ({ dayOfWeek: Number(value) }) },
  ],
  include: {
    section: { select: { name: true, course: { select: { code: true, departmentId: true } } } },
    subject: { select: { id: true, code: true, name: true } },
    faculty: { include: { user: { select: { name: true } } } },
  },
  readPermission: 'timetable:read',
  writePermission: 'timetable:write',
  scope: (req) => {
    const scope = departmentScopeFor(req);
    return scope ? { section: { course: { departmentId: scope } } } : {};
  },
  assertAccess: (req, row) => assertDepartmentAccess(req, row.section?.course?.departmentId as string),
  toCreateData: (input) => ({ ...input, room: input.room ?? '', subjectId: input.subjectId || null, facultyId: input.facultyId || null, label: input.label || null }),
  toUpdateData: (input) => ({
    ...input,
    ...(input.subjectId !== undefined ? { subjectId: input.subjectId || null } : {}),
    ...(input.facultyId !== undefined ? { facultyId: input.facultyId || null } : {}),
    ...(input.label !== undefined ? { label: input.label || null } : {}),
  }),
  serialize: (row) => ({
    id: row.id,
    dayOfWeek: row.dayOfWeek,
    day: DAYS[row.dayOfWeek] ?? '—',
    period: row.period,
    startTime: row.startTime,
    endTime: row.endTime,
    room: row.room,
    label: row.label ?? '',
    sectionId: row.sectionId,
    section: row.section ? `${row.section.course?.code ?? ''} ${row.section.name}`.trim() : '—',
    semesterId: row.semesterId,
    subjectId: row.subjectId ?? '',
    subject: row.subject ? `${row.subject.code} · ${row.subject.name}` : (row.label ?? 'Open session'),
    facultyId: row.facultyId ?? '',
    faculty: row.faculty?.user?.name ?? 'Unallocated',
    status: row.status,
    archivedAt: row.archivedAt,
  }),
  csvColumns: [
    { key: 'day', label: 'Day' },
    { key: 'period', label: 'Period' },
    { key: 'startTime', label: 'From' },
    { key: 'endTime', label: 'To' },
    { key: 'section', label: 'Section' },
    { key: 'subject', label: 'Subject' },
    { key: 'faculty', label: 'Faculty' },
    { key: 'room', label: 'Room' },
    { key: 'status', label: 'Status' },
  ],
};
