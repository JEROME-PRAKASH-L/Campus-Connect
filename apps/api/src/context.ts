import type { Request } from 'express';
import { prisma } from './prisma.js';

/** The student whose record a request is about: their own for a student, their ward for a parent. */
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
  if (!student) throw Object.assign(new Error('No student record linked to this account.'), { status: 404 });
  return student;
};

export const currentSemester = async () => {
  const semester = await prisma.semester.findFirst({ where: { isCurrent: true } });
  if (!semester) throw Object.assign(new Error('No current semester configured.'), { status: 500 });
  return semester;
};

export const facultyFor = async (userId: string) =>
  prisma.faculty.findFirst({ where: { userId }, include: { user: true, department: true } });
