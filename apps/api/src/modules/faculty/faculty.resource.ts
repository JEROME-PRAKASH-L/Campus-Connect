import { facultyCreateSchema, facultyUpdateSchema } from '@campus-connect/contracts';
import { prisma } from '../../database/prisma.js';
import { assertDepartmentAccess, departmentWhere } from '../../middleware/authorization.middleware.js';
import { badRequest } from '../../shared/errors/http-error.js';
import { generateLoginId, userCreateInput } from '../../shared/utils/identity.js';
import type { ResourceDefinition, ResourceRow } from '../../shared/resource/resource.types.js';

const PROFILE_KEYS = ['staffId', 'designation', 'qualification', 'experienceYears', 'cabin', 'mobile', 'joinedOn', 'departmentId'] as const;

export const facultyResource: ResourceDefinition = {
  name: 'faculty',
  entity: 'Faculty',
  module: 'faculty',
  delegate: () => prisma.faculty,
  createSchema: facultyCreateSchema,
  updateSchema: facultyUpdateSchema,
  searchFields: ['staffId', 'designation', 'user.name', 'user.email'],
  sortFields: ['staffId', 'designation', 'experienceYears', 'createdAt'],
  defaultSort: 'staffId',
  filters: [{ key: 'departmentId', where: (value) => ({ departmentId: value }) }],
  include: {
    user: { select: { id: true, name: true, email: true, loginId: true, role: true } },
    department: { select: { code: true } },
    _count: { select: { subjects: true, timetable: true } },
  },
  readPermission: 'faculty:read',
  writePermission: 'faculty:write',
  scope: (req) => departmentWhere(req),
  assertAccess: (req, row) => assertDepartmentAccess(req, row.departmentId as string),
  toCreateData: async (input) => {
    const department = await prisma.department.findUnique({ where: { id: input.departmentId as string }, select: { code: true } });
    if (!department) throw badRequest('Unknown department.');
    const data: ResourceRow = {};
    for (const key of PROFILE_KEYS) if (input[key] !== undefined) data[key] = input[key];
    data.qualification = input.qualification ?? '';
    data.cabin = input.cabin ?? '';
    return {
      ...data,
      user: {
        create: await userCreateInput({
          name: input.name as string,
          email: input.email as string,
          // `isHead` is what promotes a member of staff to the HOD role — the browser
          // never sends a role, so it cannot mint an administrator.
          role: input.isHead ? 'HOD' : 'FACULTY',
          departmentId: input.departmentId as string,
          extra: String(input.designation ?? ''),
          loginId: generateLoginId(input.isHead ? 'HOD' : 'FAC'),
        }),
      },
    };
  },
  toUpdateData: (input) => {
    const data: ResourceRow = {};
    for (const key of PROFILE_KEYS) if (input[key] !== undefined) data[key] = input[key];
    const user: ResourceRow = {};
    if (input.name !== undefined) user.name = input.name;
    if (input.email !== undefined) user.email = input.email;
    if (input.isHead !== undefined) user.role = input.isHead ? 'HOD' : 'FACULTY';
    if (input.designation !== undefined) user.extra = input.designation;
    if (Object.keys(user).length) data.user = { update: user };
    return data;
  },
  serialize: (row) => ({
    id: row.id,
    name: row.user?.name ?? '—',
    email: row.user?.email ?? '—',
    loginId: row.user?.loginId ?? '—',
    staffId: row.staffId,
    designation: row.designation,
    qualification: row.qualification,
    experienceYears: row.experienceYears,
    cabin: row.cabin,
    mobile: row.mobile,
    joinedOn: row.joinedOn,
    departmentId: row.departmentId,
    department: row.department?.code ?? '—',
    isHead: row.user?.role === 'HOD',
    subjects: row._count?.subjects ?? 0,
    hours: row._count?.timetable ?? 0,
    status: row.status,
    archivedAt: row.archivedAt,
  }),
  csvColumns: [
    { key: 'staffId', label: 'Staff ID' },
    { key: 'name', label: 'Name' },
    { key: 'designation', label: 'Designation' },
    { key: 'department', label: 'Department' },
    { key: 'email', label: 'Email' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'experienceYears', label: 'Experience' },
    { key: 'hours', label: 'Weekly hours' },
    { key: 'status', label: 'Status' },
  ],
};
