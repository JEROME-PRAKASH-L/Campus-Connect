import type { Request, Response } from 'express';
import { prisma } from '../../database/prisma.js';
import { departmentScopeFor } from '../../middleware/authorization.middleware.js';
import { MASTER_DATA_RESOURCES } from './admin.registry.js';

/**
 * The option lists every create/edit form needs for its selects, in one round
 * trip. Scoped to the caller's department so an HOD's dropdowns cannot even
 * offer a record they would then be refused.
 */
export const getFormOptions = async (req: Request, res: Response) => {
  const scope = departmentScopeFor(req);
  const inScope = scope ? { departmentId: scope } : {};

  const [departments, courses, semesters, sections, subjects, faculty, students, feeCategories, companies] = await Promise.all([
    prisma.department.findMany({ where: { status: 'ACTIVE' }, select: { id: true, code: true, name: true }, orderBy: { code: 'asc' } }),
    prisma.course.findMany({ where: { status: 'ACTIVE', ...inScope }, select: { id: true, code: true, name: true, degree: true }, orderBy: { code: 'asc' } }),
    prisma.semester.findMany({ where: { status: 'ACTIVE' }, select: { id: true, number: true, label: true, academicYear: true, isCurrent: true }, orderBy: [{ academicYear: 'desc' }, { number: 'asc' }] }),
    prisma.section.findMany({
      where: { status: 'ACTIVE', ...(scope ? { course: { departmentId: scope } } : {}) },
      select: { id: true, name: true, course: { select: { code: true } }, semester: { select: { number: true } } },
      orderBy: { name: 'asc' },
    }),
    prisma.subject.findMany({ where: { status: 'ACTIVE', ...inScope }, select: { id: true, code: true, name: true }, orderBy: { code: 'asc' } }),
    prisma.faculty.findMany({ where: { status: 'ACTIVE', ...inScope }, select: { id: true, staffId: true, user: { select: { name: true } } }, orderBy: { staffId: 'asc' } }),
    prisma.student.findMany({
      where: { status: 'ACTIVE', ...inScope },
      select: { id: true, registerNumber: true, user: { select: { name: true } } },
      orderBy: { registerNumber: 'asc' },
      take: 1000,
    }),
    prisma.feeCategory.findMany({ where: { status: 'ACTIVE' }, select: { id: true, code: true, name: true, defaultAmount: true }, orderBy: { code: 'asc' } }),
    prisma.company.findMany({ where: { status: 'ACTIVE' }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ]);

  res.json({
    departments: departments.map((d) => ({ value: d.id, label: `${d.code} · ${d.name}` })),
    programmes: courses.map((c) => ({ value: c.id, label: `${c.code} · ${c.degree} ${c.name}` })),
    semesters: semesters.map((s) => ({ value: s.id, label: `Semester ${s.number} · ${s.academicYear}${s.isCurrent ? ' (current)' : ''}` })),
    sections: sections.map((s) => ({ value: s.id, label: `${s.course.code} ${s.semester.number}-${s.name}` })),
    subjects: subjects.map((s) => ({ value: s.id, label: `${s.code} · ${s.name}` })),
    faculty: faculty.map((f) => ({ value: f.id, label: `${f.user.name} · ${f.staffId}` })),
    students: students.map((s) => ({ value: s.id, label: `${s.user.name} · ${s.registerNumber}` })),
    feeCategories: feeCategories.map((c) => ({ value: c.id, label: `${c.code} · ${c.name}`, amount: c.defaultAmount })),
    companies: companies.map((c) => ({ value: c.id, label: c.name })),
  });
};

/** Lets the web app discover which resources this account may open. */
export const getResourceCatalogue = (_req: Request, res: Response) => {
  res.json({
    resources: MASTER_DATA_RESOURCES.map((r) => ({
      name: r.name,
      entity: r.entity,
      module: r.module,
      readPermission: r.readPermission,
      writePermission: r.writePermission,
      archivable: r.archivable !== false,
    })),
  });
};
