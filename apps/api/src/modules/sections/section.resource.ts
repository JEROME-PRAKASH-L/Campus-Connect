import { sectionCreateSchema, sectionUpdateSchema } from '@campus-connect/contracts';
import { prisma } from '../../database/prisma.js';
import { assertDepartmentAccess } from '../../middleware/authorization.middleware.js';
import { departmentScopeFor } from '../../middleware/authorization.middleware.js';
import type { ResourceDefinition } from '../../shared/resource/resource.types.js';

export const sectionResource: ResourceDefinition = {
  name: 'sections',
  entity: 'Section',
  module: 'sections',
  delegate: () => prisma.section,
  createSchema: sectionCreateSchema,
  updateSchema: sectionUpdateSchema,
  searchFields: ['name', 'course.code', 'course.name'],
  sortFields: ['name', 'createdAt'],
  defaultSort: 'name',
  filters: [
    { key: 'semesterId', where: (value) => ({ semesterId: value }) },
    { key: 'courseId', where: (value) => ({ courseId: value }) },
  ],
  include: {
    course: { select: { id: true, code: true, name: true, departmentId: true } },
    semester: { select: { id: true, number: true, academicYear: true } },
    advisorFaculty: { include: { user: { select: { name: true } } } },
    _count: { select: { students: true } },
  },
  readPermission: 'section:read',
  writePermission: 'section:write',
  scope: (req) => {
    const scope = departmentScopeFor(req);
    return scope ? { course: { departmentId: scope } } : {};
  },
  assertAccess: (req, row) => assertDepartmentAccess(req, row.course?.departmentId as string),
  toCreateData: (input) => ({ ...input, advisorFacultyId: input.advisorFacultyId || null }),
  toUpdateData: (input) => ({ ...input, ...(input.advisorFacultyId !== undefined ? { advisorFacultyId: input.advisorFacultyId || null } : {}) }),
  serialize: (row) => ({
    id: row.id,
    name: row.name,
    courseId: row.courseId,
    course: row.course?.code ?? '—',
    semesterId: row.semesterId,
    semester: row.semester ? `Semester ${row.semester.number} · ${row.semester.academicYear}` : '—',
    advisorFacultyId: row.advisorFacultyId ?? '',
    advisor: row.advisorFaculty?.user?.name ?? null,
    students: row._count?.students ?? 0,
    status: row.status,
    archivedAt: row.archivedAt,
  }),
  csvColumns: [
    { key: 'course', label: 'Programme' },
    { key: 'semester', label: 'Semester' },
    { key: 'name', label: 'Section' },
    { key: 'advisor', label: 'Class adviser' },
    { key: 'students', label: 'Students' },
    { key: 'status', label: 'Status' },
  ],
};
