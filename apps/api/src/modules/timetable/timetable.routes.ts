import { Router } from 'express';
import { prisma } from '../../database/prisma.js';
import { requireAuth } from '../../middleware/authentication.middleware.js';
import { currentSemester, facultyFor, resolveContextStudent } from '../../shared/context/request-context.js';
import { PERIODS } from '../../shared/constants/index.js';

export const timetableRouter = Router();
timetableRouter.use(requireAuth);

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
