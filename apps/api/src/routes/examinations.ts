import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { requireAuth, requireRole } from '../auth.js';
import { param } from '../params.js';
import { currentSemester, resolveContextStudent } from '../context.js';

export const examinationsRouter = Router();
examinationsRouter.use(requireAuth);

examinationsRouter.get('/', async (req, res) => {
  const semester = await currentSemester();
  const exams = await prisma.exam.findMany({
    where: { subject: { semesterId: semester.id } },
    include: { subject: true },
    orderBy: { date: 'asc' },
  });
  const student = await resolveContextStudent(req);
  const arrears = student
    ? (await prisma.semesterResult.findMany({ where: { studentId: student.id } })).reduce((sum, r) => sum + r.arrears, 0)
    : 0;

  res.json({
    scope: student ? 'student' : 'staff',
    exams: exams.map((e) => ({
      id: e.id,
      title: e.title,
      code: e.subject.code,
      name: e.subject.name,
      subjectId: e.subject.id,
      date: e.date,
      session: e.session,
      hall: e.hall,
      seatNo: e.seatNo,
      strength: e.strength,
    })),
    candidate: student ? { name: student.user.name, registerNumber: student.registerNumber } : null,
    arrears,
  });
});

examinationsRouter.get('/:subjectId/marks', requireRole('FACULTY', 'HOD', 'ADMIN'), async (req, res) => {
  const entry = await prisma.timetableEntry.findFirst({ where: { subjectId: param(req, 'subjectId') } });
  const students = await prisma.student.findMany({
    where: entry ? { sectionId: entry.sectionId } : {},
    include: { user: true, marks: { where: { subjectId: param(req, 'subjectId') } } },
    orderBy: { registerNumber: 'asc' },
    take: 10,
  });
  res.json({
    students: students.map((s) => ({
      id: s.id,
      name: s.user.name,
      registerNumber: s.registerNumber,
      semesterExam: s.marks[0]?.semesterExam ?? null,
    })),
  });
});

examinationsRouter.post('/:subjectId/marks', requireRole('FACULTY', 'HOD', 'ADMIN'), async (req, res) => {
  const parsed = z
    .object({ marks: z.array(z.object({ studentId: z.string().min(1), semesterExam: z.number().int().min(0).max(100) })).min(1) })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Provide a mark between 0 and 100 for at least one candidate.' });
    return;
  }
  await prisma.$transaction(
    parsed.data.marks.map(({ studentId, semesterExam }) =>
      prisma.mark.upsert({
        where: { studentId_subjectId: { studentId, subjectId: param(req, 'subjectId') } },
        create: { studentId, subjectId: param(req, 'subjectId'), semesterExam },
        update: { semesterExam },
      }),
    ),
  );
  res.json({ ok: true, updated: parsed.data.marks.length });
});
