import type { AttendanceMark } from '@prisma/client';
import type { Request } from 'express';
import { currentSemester, facultyFor, requireContextStudent } from '../../context.js';
import { countsAsPresent, countsInDenominator, percentage } from '../../domain.js';
import { prisma } from '../../prisma.js';
import type { AttendanceRegisterQuery, SaveAttendanceRegisterInput } from './attendance.schemas.js';

export const subjectAttendanceFor = async (studentId: string, semesterId: string) => {
  const subjects = await prisma.subject.findMany({
    where: { semesterId },
    include: { faculty: { include: { user: true } } },
    orderBy: { code: 'asc' },
  });
  const records = await prisma.attendanceRecord.findMany({ where: { studentId } });

  return subjects.map((subject) => {
    const own = records.filter((record) => record.subjectId === subject.id);
    const held = own.filter((record) => countsInDenominator(record.mark)).length;
    const attended = own.filter((record) => countsAsPresent(record.mark)).length;

    return {
      id: subject.id,
      code: subject.code,
      name: subject.name,
      shortName: subject.shortName,
      kind: subject.kind,
      credits: subject.credits,
      room: subject.room,
      faculty: subject.faculty?.user.name ?? 'Unallocated',
      held,
      attended,
      percentage: percentage(attended, held),
    };
  });
};

export const getAttendanceOverview = async (req: Request) => {
  const role = req.user!.role;

  if (role === 'HOD' || role === 'ADMIN') {
    const departments = await prisma.department.findMany({ orderBy: { studentCount: 'desc' } });
    const institute = Number(
      (
        departments.reduce((sum, department) => sum + department.avgAttendance * department.studentCount, 0) /
        departments.reduce((sum, department) => sum + department.studentCount, 0)
      ).toFixed(1),
    );
    return { scope: 'department' as const, departments, institute };
  }

  if (role === 'FACULTY') {
    const faculty = await facultyFor(req.user!.sub);
    const subjects = await prisma.subject.findMany({
      where: { facultyId: faculty?.id },
      include: { attendance: true },
      orderBy: { code: 'asc' },
    });

    return {
      scope: 'faculty' as const,
      subjects: subjects.map((subject) => {
        const held = subject.attendance.filter((record) => countsInDenominator(record.mark)).length;
        const attended = subject.attendance.filter((record) => countsAsPresent(record.mark)).length;

        return {
          id: subject.id,
          code: subject.code,
          name: subject.name,
          shortName: subject.shortName,
          kind: subject.kind,
          percentage: percentage(attended, held),
          sessions: subject.periodsHeld,
        };
      }),
    };
  }

  const student = await requireContextStudent(req);
  const semester = await currentSemester();
  const subjects = await subjectAttendanceFor(student.id, semester.id);
  const held = subjects.reduce((sum, subject) => sum + subject.held, 0);
  const attended = subjects.reduce((sum, subject) => sum + subject.attended, 0);

  return {
    scope: 'student' as const,
    student: {
      name: student.user.name,
      registerNumber: student.registerNumber,
      section: student.section.name,
    },
    subjects,
    overall: { held, attended, percentage: percentage(attended, held) },
  };
};

export const getAttendanceRegister = async ({ subjectId, date, period }: AttendanceRegisterQuery) => {
  const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
  if (!subject) return null;

  const entry = await prisma.timetableEntry.findFirst({
    where: { subjectId },
    include: { section: true },
  });
  const students = await prisma.student.findMany({
    where: entry ? { sectionId: entry.sectionId } : { departmentId: subject.departmentId },
    include: { user: true, attendance: { where: { subjectId } } },
    orderBy: { registerNumber: 'asc' },
  });
  const saved = await prisma.attendanceRecord.findMany({
    where: { subjectId, date: new Date(date), period },
  });

  return {
    subject: { id: subject.id, code: subject.code, name: subject.name },
    section: entry?.section.name ?? '—',
    students: students.map((student) => {
      const held = student.attendance.filter((record) => countsInDenominator(record.mark)).length;
      const attended = student.attendance.filter((record) => countsAsPresent(record.mark)).length;

      return {
        id: student.id,
        name: student.user.name,
        registerNumber: student.registerNumber,
        cumulative: percentage(attended, held),
        mark: saved.find((record) => record.studentId === student.id)?.mark ?? null,
      };
    }),
  };
};

export const saveAttendanceRegister = async (
  { subjectId, date, period, marks }: SaveAttendanceRegisterInput,
  markedById: string,
) => {
  const day = new Date(date);
  const existing = await prisma.attendanceRecord.count({ where: { subjectId, date: day, period } });

  await prisma.$transaction([
    ...marks.map(({ studentId, mark }) =>
      prisma.attendanceRecord.upsert({
        where: { studentId_subjectId_date_period: { studentId, subjectId, date: day, period } },
        create: {
          studentId,
          subjectId,
          date: day,
          period,
          mark: mark as AttendanceMark,
          markedById,
        },
        update: { mark: mark as AttendanceMark, markedById },
      }),
    ),
    ...(existing === 0
      ? [prisma.subject.update({ where: { id: subjectId }, data: { periodsHeld: { increment: 1 } } })]
      : []),
  ]);

  const tally = marks.reduce(
    (counts, mark) => ({ ...counts, [mark.mark]: (counts[mark.mark] ?? 0) + 1 }),
    {} as Record<string, number>,
  );

  const shortStudents = await Promise.all(
    marks.map(async ({ studentId }) => {
      const own = await prisma.attendanceRecord.findMany({ where: { studentId, subjectId } });
      const held = own.filter((record) => countsInDenominator(record.mark)).length;
      const attended = own.filter((record) => countsAsPresent(record.mark)).length;
      return { studentId, percentage: percentage(attended, held) };
    }),
  );

  const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
  await Promise.all(
    shortStudents
      .filter((student) => student.percentage < 75)
      .map(async ({ studentId, percentage: attendancePercentage }) => {
        const student = await prisma.student.findUnique({ where: { id: studentId } });
        if (!student) return;

        await prisma.notification.create({
          data: {
            kind: 'ATTENDANCE',
            title: `Attendance shortage — ${subject?.code}`,
            body: `${subject?.name} is at ${attendancePercentage}%. Minimum required is 75%.`,
            tone: 'BAD',
            route: 'attendance',
            recipientId: student.userId,
          },
        });
      }),
  );

  return { ok: true, tally, updated: marks.length };
};

export const getRecentAttendanceSessions = async (userId: string) => {
  const faculty = await facultyFor(userId);
  const records = await prisma.attendanceRecord.findMany({
    where: faculty ? { subject: { facultyId: faculty.id } } : {},
    include: { subject: true },
    orderBy: { date: 'desc' },
    take: 600,
  });
  const grouped = new Map<
    string,
    { date: Date; code: string; name: string; present: number; total: number }
  >();

  for (const record of records) {
    const key = `${record.date.toISOString()}|${record.subjectId}|${record.period}`;
    const bucket = grouped.get(key) ?? {
      date: record.date,
      code: record.subject.code,
      name: record.subject.name,
      present: 0,
      total: 0,
    };
    if (countsInDenominator(record.mark)) bucket.total += 1;
    if (countsAsPresent(record.mark)) bucket.present += 1;
    grouped.set(key, bucket);
  }

  return {
    sessions: [...grouped.values()]
      .sort((first, second) => second.date.getTime() - first.date.getTime())
      .slice(0, 5)
      .map((session) => ({
        date: session.date,
        code: session.code,
        name: session.name,
        percentage: percentage(session.present, session.total),
      })),
  };
};
