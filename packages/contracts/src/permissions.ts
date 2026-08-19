import { ROLES, type Role } from './roles.js';

/**
 * Permissions are `<resource>:<action>` strings. The matrix below is the single
 * source of truth: the API enforces it and the web app uses the same table to
 * decide which actions to render, so the two can never drift.
 */
export const PERMISSIONS = [
  'institution:read',
  'institution:write',
  'department:read',
  'department:write',
  'programme:read',
  'programme:write',
  'academic-year:read',
  'academic-year:write',
  'section:read',
  'section:write',
  'subject:read',
  'subject:write',
  'student:read',
  'student:write',
  'student:read-own',
  'student:write-own',
  'faculty:read',
  'faculty:write',
  'parent:read',
  'parent:write',
  'user:read',
  'user:write',
  'timetable:read',
  'timetable:write',
  'attendance:read',
  'attendance:write',
  'attendance:correct',
  'marks:read',
  'marks:write',
  'marks:approve',
  'assignment:read',
  'assignment:write',
  'assignment:submit',
  'examination:read',
  'examination:write',
  'result:read',
  'result:publish',
  'fee:read',
  'fee:write',
  'fee:pay',
  'leave:read',
  'leave:apply',
  'leave:decide',
  'material:read',
  'material:write',
  'notification:read',
  'notification:announce',
  'calendar:read',
  'calendar:write',
  'placement:read',
  'placement:write',
  'placement:register',
  'report:read',
  'support:raise',
  'support:resolve',
  'audit:read',
  'settings:read',
  'settings:write',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const STUDENT: Permission[] = [
  'student:read-own',
  'student:write-own',
  'timetable:read',
  'attendance:read',
  'marks:read',
  'assignment:read',
  'assignment:submit',
  'examination:read',
  'result:read',
  'fee:read',
  'fee:pay',
  'leave:read',
  'leave:apply',
  'material:read',
  'notification:read',
  'calendar:read',
  'placement:read',
  'placement:register',
  'support:raise',
];

const PARENT: Permission[] = [
  'student:read-own',
  'timetable:read',
  'attendance:read',
  'marks:read',
  'examination:read',
  'result:read',
  'fee:read',
  'fee:pay',
  'notification:read',
  'calendar:read',
  'support:raise',
];

const FACULTY: Permission[] = [
  'institution:read',
  'department:read',
  'programme:read',
  'academic-year:read',
  'section:read',
  'subject:read',
  'student:read',
  'faculty:read',
  'timetable:read',
  'attendance:read',
  'attendance:write',
  'marks:read',
  'marks:write',
  'assignment:read',
  'assignment:write',
  'examination:read',
  'result:read',
  'leave:read',
  'leave:decide',
  'leave:apply',
  'material:read',
  'material:write',
  'notification:read',
  'notification:announce',
  'calendar:read',
  'placement:read',
  'report:read',
  'support:raise',
];

const HOD: Permission[] = [
  ...FACULTY,
  // An HOD runs a department: they read the master data their department hangs
  // off and write the parts of it that are theirs. Every one of these is still
  // scoped to their own department by `departmentScopeFor`.
  'parent:read',
  'fee:read',
  'report:read',
  'department:write',
  'section:write',
  'subject:write',
  'timetable:write',
  'attendance:correct',
  'marks:approve',
  'examination:write',
  'student:write',
  'faculty:write',
  'support:resolve',
];

const ADMIN: Permission[] = [...PERMISSIONS];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  STUDENT,
  PARENT,
  FACULTY,
  HOD: [...new Set(HOD)],
  ADMIN,
};

export const can = (role: Role, permission: Permission): boolean => ROLE_PERMISSIONS[role].includes(permission);

export const permissionCount = (role: Role): number => ROLE_PERMISSIONS[role].length;

export const rolesWith = (permission: Permission): Role[] => ROLES.filter((role) => can(role, permission));
