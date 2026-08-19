import { Router } from 'express';
import { z } from 'zod';
import type { AttendanceMark } from '@prisma/client';
import { prisma } from '../../database/prisma.js';
import { requireAuth } from '../../middleware/authentication.middleware.js';
import { requireRole } from '../../middleware/authorization.middleware.js';
import { currentSemester, facultyFor, requireContextStudent } from '../../shared/context/request-context.js';
import { countsAsPresent, countsInDenominator, percentage } from '../../shared/utils/domain.js';
import { subjectAttendanceFor } from './attendance.service.js';

export const attendanceRouter = Router();
attendanceRouter.use(requireAuth);

attendanceRouter.get('/', async (req, res) => {
  const role = req.user!.role;

  if (role === 'HOD' || role === 'ADMIN') {
    const departments = await prisma.department.findMany({ orderBy: { studentCount: 'desc' } });
    const institute = Number(
      (departments.reduce((sum, d) => sum + d.avgAttendance * d.studentCount, 0) /
        departments.reduce((sum, d) => sum + d.studentCount, 0)).toFixed(1),
    );
    res.json({ scope: 'department', departments, institute });
    return;
  }

  if (role === 'FACULTY') {
    const faculty = await facultyFor(req.user!.sub);
    const subjects = await prisma.subject.findMany({
      where: { facultyId: faculty?.id },
      include: { attendance: true },
      orderBy: { code: 'asc' },
    });
    res.json({
      scope: 'faculty',
      subjects: subjects.map((s) => {
        const held = s.attendance.filter((r) => countsInDenominator(r.mark)).length;
        const attended = s.attendance.filter((r) => countsAsPresent(r.mark)).length;
        return {
          id: s.id,
          code: s.code,
          name: s.name,
          shortName: s.shortName,
          kind: s.kind,
          percentage: percentage(attended, held),
          sessions: s.periodsHeld,
        };
      }),
    });
    return;
  }

  const student = await requireContextStudent(req);
  const semester = await currentSemester();
  const subjects = await subjectAttendanceFor(student.id, semester.id);
  const held = subjects.reduce((sum, s) => sum + s.held, 0);
  const attended = subjects.reduce((sum, s) => sum + s.attended, 0);
  res.json({
    scope: 'student',
    student: { name: student.user.name, registerNumber: student.registerNumber, section: student.section.name },
    subjects,
    overall: { held, attended, percentage: percentage(attended, held) },
  });
});

/** Roster for a faculty register: every student in the section with their cumulative percentage and any saved marks. */
attendanceRouter.get('/register', requireRole('FACULTY', 'HOD', 'ADMIN'), async (req, res) => {
  const query = z.object({ subjectId: z.string().min(1), date: z.string().min(1), period: z.coerce.number().default(1) }).safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: 'A subject and date are required.' });
    return;
  }
  const { subjectId, date, period } = query.data;
  const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
  if (!subject) {
    res.status(404).json({ error: 'Subject not found.' });
    return;
  }
  const entry = await prisma.timetableEntry.findFirst({ where: { subjectId }, include: { section: true } });
  const students = await prisma.student.findMany({
    where: entry ? { sectionId: entry.sectionId } : { departmentId: subject.departmentId },
    include: { user: true, attendance: { where: { subjectId } } },
    orderBy: { registerNumber: 'asc' },
  });
  const day = new Date(date);
  const saved = await prisma.attendanceRecord.findMany({ where: { subjectId, date: day, period } });

  res.json({
    subject: { id: subject.id, code: subject.code, name: subject.name },
    section: entry?.section.name ?? '—',
    students: students.map((s) => {
      const held = s.attendance.filter((r) => countsInDenominator(r.mark)).length;
      const attended = s.attendance.filter((r) => countsAsPresent(r.mark)).length;
      return {
        id: s.id,
        name: s.user.name,
        registerNumber: s.registerNumber,
        cumulative: percentage(attended, held),
        mark: saved.find((r) => r.studentId === s.id)?.mark ?? null,
      };
    }),
  });
});

const saveSchema = z.object({
  subjectId: z.string().min(1),
  date: z.string().min(1),
  period: z.number().int().min(1).max(7).default(1),
  marks: z.array(z.object({ studentId: z.string().min(1), mark: z.enum(['PRESENT', 'ABSENT', 'ON_DUTY', 'LEAVE']) })).min(1),
});

attendanceRouter.post('/register', requireRole('FACULTY', 'HOD', 'ADMIN'), async (req, res) => {
  const parsed = saveSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }
  const { subjectId, date, period, marks } = parsed.data;
  const day = new Date(date);

  const existing = await prisma.attendanceRecord.count({ where: { subjectId, date: day, period } });

  await prisma.$transaction([
    ...marks.map(({ studentId, mark }) =>
      prisma.attendanceRecord.upsert({
        where: { studentId_subjectId_date_period: { studentId, subjectId, date: day, period } },
        create: { studentId, subjectId, date: day, period, mark: mark as AttendanceMark, markedById: req.user!.sub },
        update: { mark: mark as AttendanceMark, markedById: req.user!.sub },
      }),
    ),
    ...(existing === 0 ? [prisma.subject.update({ where: { id: subjectId }, data: { periodsHeld: { increment: 1 } } })] : []),
  ]);

  const tally = marks.reduce(
    (acc, m) => ({ ...acc, [m.mark]: (acc[m.mark] ?? 0) + 1 }),
    {} as Record<string, number>,
  );

  const shortStudents = await Promise.all(
    marks.map(async ({ studentId }) => {
      const own = await prisma.attendanceRecord.findMany({ where: { studentId, subjectId } });
      const held = own.filter((r) => countsInDenominator(r.mark)).length;
      const attended = own.filter((r) => countsAsPresent(r.mark)).length;
      return { studentId, percentage: percentage(attended, held) };
    }),
  );

  const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
  await Promise.all(
    shortStudents
      .filter((s) => s.percentage < 75)
      .map(async ({ studentId, percentage: pct }) => {
        const student = await prisma.student.findUnique({ where: { id: studentId } });
        if (!student) return;
        await prisma.notification.create({
          data: {
            kind: 'ATTENDANCE',
            title: `Attendance shortage — ${subject?.code}`,
            body: `${subject?.name} is at ${pct}%. Minimum required is 75%.`,
            tone: 'BAD',
            route: 'attendance',
            recipientId: student.userId,
          },
        });
      }),
  );

  res.json({ ok: true, tally, updated: marks.length });
});

attendanceRouter.get('/sessions', requireRole('FACULTY', 'HOD', 'ADMIN'), async (req, res) => {
  const faculty = await facultyFor(req.user!.sub);
  const records = await prisma.attendanceRecord.findMany({
    where: faculty ? { subject: { facultyId: faculty.id } } : {},
    include: { subject: true },
    orderBy: { date: 'desc' },
    take: 600,
  });
  const grouped = new Map<string, { date: Date; code: string; name: string; present: number; total: number }>();
  for (const record of records) {
    const key = `${record.date.toISOString()}|${record.subjectId}|${record.period}`;
    const bucket = grouped.get(key) ?? { date: record.date, code: record.subject.code, name: record.subject.name, present: 0, total: 0 };
    if (countsInDenominator(record.mark)) bucket.total += 1;
    if (countsAsPresent(record.mark)) bucket.present += 1;
    grouped.set(key, bucket);
  }
  res.json({
    sessions: [...grouped.values()]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 5)
      .map((s) => ({ date: s.date, code: s.code, name: s.name, percentage: percentage(s.present, s.total) })),
  });
});
