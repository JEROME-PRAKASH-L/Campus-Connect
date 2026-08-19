import { studentCreateSchema, studentUpdateSchema } from '@campus-connect/contracts';
import { prisma } from '../../database/prisma.js';
import { assertDepartmentAccess, departmentWhere } from '../../middleware/authorization.middleware.js';
import { badRequest } from '../../shared/errors/http-error.js';
import { generateLoginId, userCreateInput } from '../../shared/utils/identity.js';
import type { ResourceDefinition, ResourceRow } from '../../shared/resource/resource.types.js';

/** Student-facing columns; the linked `User` row is created and updated alongside. */
const PROFILE_KEYS = ['registerNumber', 'batch', 'dateOfBirth', 'bloodGroup', 'mobile', 'residence', 'admissionQuota', 'mentorName', 'departmentId', 'courseId', 'sectionId'] as const;

export const studentResource: ResourceDefinition = {
  name: 'students',
  entity: 'Student',
  module: 'students',
  delegate: () => prisma.student,
  createSchema: studentCreateSchema,
  updateSchema: studentUpdateSchema,
  searchFields: ['registerNumber', 'user.name', 'user.email', 'mobile'],
  sortFields: ['registerNumber', 'batch', 'createdAt'],
  defaultSort: 'registerNumber',
  filters: [
    { key: 'departmentId', where: (value) => ({ departmentId: value }) },
    { key: 'sectionId', where: (value) => ({ sectionId: value }) },
    { key: 'courseId', where: (value) => ({ courseId: value }) },
    { key: 'batch', where: (value) => ({ batch: value }) },
  ],
  include: {
    user: { select: { id: true, name: true, email: true, loginId: true } },
    department: { select: { code: true } },
    course: { select: { code: true, degree: true } },
    section: { select: { name: true, semester: { select: { number: true } } } },
    photoFile: { select: { url: true } },
  },
  readPermission: 'student:read',
  writePermission: 'student:write',
  scope: (req) => departmentWhere(req),
  assertAccess: (req, row) => assertDepartmentAccess(req, row.departmentId as string),
  toCreateData: async (input) => {
    const department = await prisma.department.findUnique({ where: { id: input.departmentId as string }, select: { code: true } });
    if (!department) throw badRequest('Unknown department.');
    const data: ResourceRow = {};
    for (const key of PROFILE_KEYS) if (input[key] !== undefined) data[key] = input[key];
    return {
      ...data,
      photoFileId: input.photoFileId || null,
      user: {
        create: await userCreateInput({
          name: input.name as string,
          email: input.email as string,
          role: 'STUDENT',
          departmentId: input.departmentId as string,
          extra: `${department.code} student`,
          loginId: generateLoginId(`26${department.code}`),
        }),
      },
    };
  },
  toUpdateData: (input) => {
    const data: ResourceRow = {};
    for (const key of PROFILE_KEYS) if (input[key] !== undefined) data[key] = input[key];
    if (input.photoFileId !== undefined) data.photoFileId = input.photoFileId || null;
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
    registerNumber: row.registerNumber,
    batch: row.batch,
    dateOfBirth: row.dateOfBirth,
    bloodGroup: row.bloodGroup,
    mobile: row.mobile,
    residence: row.residence,
    admissionQuota: row.admissionQuota,
    mentorName: row.mentorName,
    departmentId: row.departmentId,
    department: row.department?.code ?? '—',
    courseId: row.courseId,
    programme: row.course ? `${row.course.degree} ${row.course.code}` : '—',
    sectionId: row.sectionId,
    section: row.section ? `${row.section.semester?.number ?? '?'}-${row.section.name}` : '—',
    photoUrl: row.photoFile?.url ?? row.photoUrl ?? null,
    status: row.status,
    archivedAt: row.archivedAt,
  }),
  csvColumns: [
    { key: 'registerNumber', label: 'Register number' },
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'department', label: 'Department' },
    { key: 'programme', label: 'Programme' },
    { key: 'section', label: 'Section' },
    { key: 'batch', label: 'Batch' },
    { key: 'status', label: 'Status' },
  ],
};
