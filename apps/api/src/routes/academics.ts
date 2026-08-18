import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { requireAuth, requireRole } from '../auth.js';
import { currentSemester, resolveContextStudent } from '../context.js';
import { subjectAttendanceFor } from '../modules/attendance/attendance.service.js';

export const academicsRouter = Router();
academicsRouter.use(requireAuth);

academicsRouter.get('/', async (req, res) => {
  const semester = await currentSemester();
  const student = await resolveContextStudent(req);

  if (student) {
    const subjects = await subjectAttendanceFor(student.id, semester.id);
    const feedback = await prisma.facultyFeedback.findMany({ where: { studentId: student.id } });
    const results = await prisma.semesterResult.findMany({ where: { studentId: student.id } });
    res.json({
      scope: 'student',
      subjects: subjects.map((s) => ({ ...s, rating: feedback.find((f) => f.subjectId === s.id)?.rating ?? 0 })),
      creditsEarned: results.reduce((sum, r) => sum + r.credits, 0),
      feedbackGiven: feedback.length,
    });
    return;
  }

  if (req.user!.role === 'ADMIN') {
    const departments = await prisma.department.findMany({ orderBy: { name: 'asc' } });
    const courses = await prisma.course.findMany({ include: { department: true } });
    res.json({ scope: 'institute', departments, courses: courses.map((c) => ({ id: c.id, code: c.code, name: c.name, department: c.department.code })) });
    return;
  }

  const subjects = await prisma.subject.findMany({
    where: { semesterId: semester.id },
    include: { faculty: { include: { user: true } }, timetable: true },
    orderBy: { code: 'asc' },
  });
  const faculty = await prisma.faculty.findMany({ include: { user: true }, orderBy: { staffId: 'asc' } });
  res.json({
    scope: 'department',
    subjects: subjects.map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      shortName: s.shortName,
      credits: s.credits,
      kind: s.kind,
      faculty: s.faculty?.user.name ?? 'Unallocated',
      facultyId: s.facultyId,
      sections: new Set(s.timetable.map((t) => t.sectionId)).size,
      hours: s.credits * 3,
    })),
    facultyOptions: faculty.map((f) => ({ id: f.id, name: f.user.name })),
  });
});

academicsRouter.post('/feedback', requireRole('STUDENT'), async (req, res) => {
  const parsed = z.object({ subjectId: z.string().min(1), rating: z.number().int().min(1).max(5) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'A subject and a rating from 1 to 5 are required.' });
    return;
  }
  const student = await resolveContextStudent(req);
  if (!student) {
    res.status(404).json({ error: 'No student record linked to this account.' });
    return;
  }
  const subject = await prisma.subject.findUnique({ where: { id: parsed.data.subjectId } });
  if (!subject?.facultyId) {
    res.status(400).json({ error: 'This subject has no faculty allocated yet.' });
    return;
  }
  await prisma.facultyFeedback.upsert({
    where: { studentId_subjectId: { studentId: student.id, subjectId: subject.id } },
    create: { studentId: student.id, subjectId: subject.id, facultyId: subject.facultyId, rating: parsed.data.rating },
    update: { rating: parsed.data.rating },
  });
  res.json({ ok: true });
});

academicsRouter.post('/allocate', requireRole('HOD', 'ADMIN'), async (req, res) => {
  const parsed = z.object({ subjectId: z.string().min(1), facultyId: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'A subject and a faculty member are required.' });
    return;
  }
  const subject = await prisma.subject.update({
    where: { id: parsed.data.subjectId },
    data: { facultyId: parsed.data.facultyId },
    include: { faculty: { include: { user: true } } },
  });
  await prisma.timetableEntry.updateMany({ where: { subjectId: subject.id }, data: { facultyId: parsed.data.facultyId } });
  res.json({ ok: true, subject: { code: subject.code, faculty: subject.faculty?.user.name ?? '' } });
});
