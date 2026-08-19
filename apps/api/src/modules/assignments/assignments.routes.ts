import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../database/prisma.js';
import { requireAuth } from '../../middleware/authentication.middleware.js';
import { requireRole } from '../../middleware/authorization.middleware.js';
import { param } from '../../shared/utils/params.js';
import { currentSemester, facultyFor, resolveContextStudent } from '../../shared/context/request-context.js';

export const assignmentsRouter = Router();
assignmentsRouter.use(requireAuth);

assignmentsRouter.get('/', async (req, res) => {
  const student = await resolveContextStudent(req);

  if (student) {
    const assignments = await prisma.assignment.findMany({
      where: { sectionId: student.sectionId },
      include: { subject: true, submissions: { where: { studentId: student.id } } },
      orderBy: { dueDate: 'asc' },
    });
    res.json({
      scope: 'student',
      assignments: assignments.map((a) => {
        const submission = a.submissions[0];
        return {
          id: a.id,
          title: a.title,
          brief: a.brief,
          dueDate: a.dueDate,
          maxMarks: a.maxMarks,
          subject: { code: a.subject.code, shortName: a.subject.shortName, name: a.subject.name },
          status: submission?.status ?? 'PENDING',
          score: submission?.score ?? null,
          fileCount: submission?.fileCount ?? 0,
          feedback: submission?.feedback ?? '',
        };
      }),
    });
    return;
  }

  const faculty = await facultyFor(req.user!.sub);
  const assignments = await prisma.assignment.findMany({
    where: faculty ? { facultyId: faculty.id } : {},
    include: { subject: true, section: true, submissions: { include: { student: { include: { user: true } } } } },
    orderBy: { dueDate: 'desc' },
  });
  const sectionSizes = new Map<string, number>();
  for (const a of assignments) {
    if (!sectionSizes.has(a.sectionId)) {
      sectionSizes.set(a.sectionId, await prisma.student.count({ where: { sectionId: a.sectionId } }));
    }
  }
  res.json({
    scope: 'faculty',
    assignments: assignments.map((a) => ({
      id: a.id,
      title: a.title,
      brief: a.brief,
      dueDate: a.dueDate,
      maxMarks: a.maxMarks,
      subject: { code: a.subject.code, shortName: a.subject.shortName, name: a.subject.name },
      section: a.section.name,
      total: sectionSizes.get(a.sectionId) ?? 0,
      submitted: a.submissions.filter((s) => s.status !== 'PENDING').length,
      graded: a.submissions.filter((s) => s.status === 'GRADED').length,
      averageScore: (() => {
        const scored = a.submissions.filter((s) => s.score !== null);
        if (!scored.length) return null;
        return Number((scored.reduce((sum, s) => sum + (s.score ?? 0), 0) / scored.length).toFixed(1));
      })(),
      submissions: a.submissions.map((s) => ({
        studentId: s.studentId,
        name: s.student.user.name,
        registerNumber: s.student.registerNumber,
        status: s.status,
        score: s.score,
      })),
    })),
  });
});

const createSchema = z.object({
  title: z.string().trim().min(1, 'Give the assignment a title.'),
  subjectId: z.string().min(1),
  sectionId: z.string().min(1).optional(),
  dueDate: z.string().min(1),
  maxMarks: z.coerce.number().int().min(1).max(100).default(20),
  brief: z.string().default(''),
});

assignmentsRouter.post('/', requireRole('FACULTY', 'HOD', 'ADMIN'), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }
  const faculty = await facultyFor(req.user!.sub);
  if (!faculty) {
    res.status(403).json({ error: 'Only teaching staff can publish assignments.' });
    return;
  }
  const semester = await currentSemester();
  const sectionId =
    parsed.data.sectionId ?? (await prisma.section.findFirst({ where: { semesterId: semester.id } }))?.id;
  if (!sectionId) {
    res.status(400).json({ error: 'No section available for the current semester.' });
    return;
  }

  const assignment = await prisma.assignment.create({
    data: {
      title: parsed.data.title,
      brief: parsed.data.brief,
      dueDate: new Date(parsed.data.dueDate),
      maxMarks: parsed.data.maxMarks,
      subjectId: parsed.data.subjectId,
      sectionId,
      facultyId: faculty.id,
    },
    include: { subject: true },
  });

  const students = await prisma.student.findMany({ where: { sectionId } });
  await prisma.submission.createMany({
    data: students.map((s) => ({ assignmentId: assignment.id, studentId: s.id })),
  });
  await prisma.notification.createMany({
    data: students.map((s) => ({
      kind: 'ASSIGNMENT' as const,
      title: `New assignment posted — ${assignment.subject.code}`,
      body: `${assignment.title}, due ${assignment.dueDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}.`,
      tone: 'ACCENT' as const,
      route: 'assignments',
      recipientId: s.userId,
      authorId: req.user!.sub,
    })),
  });

  res.status(201).json({ ok: true, id: assignment.id, notified: students.length });
});

assignmentsRouter.post('/:id/submit', requireRole('STUDENT'), async (req, res) => {
  const student = await resolveContextStudent(req);
  if (!student) {
    res.status(404).json({ error: 'No student record linked to this account.' });
    return;
  }
  const note = z.object({ note: z.string().default('') }).safeParse(req.body);
  const assignment = await prisma.assignment.findUnique({ where: { id: param(req, 'id') } });
  if (!assignment) {
    res.status(404).json({ error: 'Assignment not found.' });
    return;
  }
  await prisma.submission.upsert({
    where: { assignmentId_studentId: { assignmentId: assignment.id, studentId: student.id } },
    create: {
      assignmentId: assignment.id,
      studentId: student.id,
      status: 'SUBMITTED',
      fileCount: 1,
      note: note.success ? note.data.note : '',
      submittedAt: new Date(),
    },
    update: { status: 'SUBMITTED', fileCount: 1, note: note.success ? note.data.note : '', submittedAt: new Date() },
  });
  res.json({ ok: true });
});

assignmentsRouter.post('/:id/grade', requireRole('FACULTY', 'HOD', 'ADMIN'), async (req, res) => {
  const parsed = z
    .object({
      scores: z.array(z.object({ studentId: z.string().min(1), score: z.number().int().min(0), feedback: z.string().default('') })).min(1),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Provide a score for at least one student.' });
    return;
  }
  const assignment = await prisma.assignment.findUnique({ where: { id: param(req, 'id') } });
  if (!assignment) {
    res.status(404).json({ error: 'Assignment not found.' });
    return;
  }
  await prisma.$transaction(
    parsed.data.scores.map(({ studentId, score, feedback }) =>
      prisma.submission.upsert({
        where: { assignmentId_studentId: { assignmentId: assignment.id, studentId } },
        create: { assignmentId: assignment.id, studentId, status: 'GRADED', score: Math.min(score, assignment.maxMarks), feedback },
        update: { status: 'GRADED', score: Math.min(score, assignment.maxMarks), feedback },
      }),
    ),
  );
  res.json({ ok: true, graded: parsed.data.scores.length });
});
