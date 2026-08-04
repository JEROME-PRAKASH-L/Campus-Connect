import { Router } from 'express';
import { prisma } from '../prisma.js';
import { requireAuth } from '../auth.js';
import { currentSemester, facultyFor, resolveContextStudent } from '../context.js';

export const timetableRouter = Router();
timetableRouter.use(requireAuth);

export const PERIODS = [
  ['09:00', '09:50'],
  ['09:50', '10:40'],
  ['11:00', '11:50'],
  ['11:50', '12:40'],
  ['13:30', '14:20'],
  ['14:20', '15:10'],
  ['15:10', '16:00'],
];

timetableRouter.get('/', async (req, res) => {
  const semester = await currentSemester();
  const sectionId = typeof req.query.sectionId === 'string' ? req.query.sectionId : undefined;
  const student = await resolveContextStudent(req);
  const faculty = await facultyFor(req.user!.sub);

  const where = student
    ? { sectionId: student.sectionId }
    : sectionId
      ? { sectionId }
      : faculty
        ? { facultyId: faculty.id }
        : { semesterId: semester.id };

  const entries = await prisma.timetableEntry.findMany({
    where,
    include: {
      subject: { include: { faculty: { include: { user: true } } } },
      section: true,
      faculty: { include: { user: true } },
    },
    orderBy: [{ dayOfWeek: 'asc' }, { period: 'asc' }],
  });

  const sections = await prisma.section.findMany({
    where: { semesterId: semester.id },
    include: { course: true },
    orderBy: { name: 'asc' },
  });

  res.json({
    periods: PERIODS,
    scope: student ? 'student' : faculty ? 'faculty' : 'section',
    sections: sections.map((s) => ({ id: s.id, label: `${s.course.code} ${semester.number}-${s.name}` })),
    entries: entries.map((e) => ({
      dayOfWeek: e.dayOfWeek,
      period: e.period,
      startTime: e.startTime,
      endTime: e.endTime,
      room: e.room,
      label: e.label,
      section: e.section.name,
      subject: e.subject
        ? {
            id: e.subject.id,
            code: e.subject.code,
            name: e.subject.name,
            faculty: e.subject.faculty?.user.name ?? 'Unallocated',
          }
        : null,
    })),
  });
});
