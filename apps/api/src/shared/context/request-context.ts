import type { Request } from 'express';
import { prisma } from '../../database/prisma.js';
import { forbidden, notFound } from '../errors/http-error.js';

/**
 * The student a request is about: their own record for a student, their linked
 * ward for a parent. Resolved from the JWT subject only — a caller can never
 * name a different student in the payload and have it honoured.
 */
export const resolveContextStudent = async (req: Request) => {
  const user = req.user!;
  if (user.role === 'STUDENT') {
    return prisma.student.findFirst({
      where: { user: { id: user.sub } },
      include: { user: true, department: true, course: true, section: { include: { semester: true } } },
    });
  }
  if (user.role === 'PARENT') {
    const parent = await prisma.parent.findFirst({ where: { userId: user.sub } });
    if (!parent) return null;
    return prisma.student.findUnique({
      where: { id: parent.wardId },
      include: { user: true, department: true, course: true, section: { include: { semester: true } } },
    });
  }
  return null;
};

export const requireContextStudent = async (req: Request) => {
  const student = await resolveContextStudent(req);
  if (!student) throw notFound('No student record linked to this account.');
  return student;
};

export const currentSemester = async () => {
  const semester = await prisma.semester.findFirst({ where: { isCurrent: true } });
  if (!semester) throw Object.assign(new Error('No current semester configured.'), { status: 500 });
  return semester;
};

export const facultyFor = async (userId: string) =>
  prisma.faculty.findFirst({ where: { userId }, include: { user: true, department: true } });

export const requireFaculty = async (req: Request) => {
  const faculty = await facultyFor(req.user!.sub);
  if (!faculty) throw forbidden('Only teaching staff can perform this action.');
  return faculty;
};

/**
 * Faculty may only enter data against subjects allocated to them. HODs may act
 * anywhere inside their own department; administrators anywhere at all.
 */
export const assertSubjectAccess = async (req: Request, subjectId: string) => {
  const user = req.user!;
  const subject = await prisma.subject.findUnique({ where: { id: subjectId }, select: { id: true, facultyId: true, departmentId: true } });
  if (!subject) throw notFound('Subject not found.');

  if (user.role === 'ADMIN') return subject;
  if (user.role === 'HOD') {
    if (user.departmentId && subject.departmentId !== user.departmentId) {
      throw forbidden('That subject belongs to another department.');
    }
    return subject;
  }
  if (user.role === 'FACULTY') {
    const faculty = await facultyFor(user.sub);
    if (!faculty || subject.facultyId !== faculty.id) {
      throw forbidden('That subject is not allocated to you.');
    }
    return subject;
  }
  throw forbidden();
};

/** Staff-side read access to one student's record, scoped by department for an HOD. */
export const assertStudentAccess = async (req: Request, studentId: string) => {
  const user = req.user!;
  const student = await prisma.student.findUnique({ where: { id: studentId }, select: { id: true, departmentId: true, userId: true } });
  if (!student) throw notFound('Student not found.');

  if (user.role === 'ADMIN' || user.role === 'FACULTY') return student;
  if (user.role === 'HOD') {
    if (user.departmentId && student.departmentId !== user.departmentId) {
      throw forbidden('That student belongs to another department.');
    }
    return student;
  }
  const context = await resolveContextStudent(req);
  if (context?.id !== student.id) throw forbidden('You can only access your own record.');
  return student;
};
