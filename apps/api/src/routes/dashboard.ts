import { Router } from 'express';
import { prisma } from '../prisma.js';
import { requireAuth } from '../auth.js';
import { currentSemester, facultyFor, resolveContextStudent } from '../context.js';
import { cgpaFrom, countsAsPresent, countsInDenominator, percentage } from '../domain.js';
import { PERIODS } from './timetable.js';
import { subjectAttendanceFor } from './attendance.js';

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

dashboardRouter.get('/', async (req, res) => {
  const role = req.user!.role;
  const semester = await currentSemester();
  const student = await resolveContextStudent(req);
  const faculty = await facultyFor(req.user!.sub);
  const now = new Date();
  const dayOfWeek = now.getDay();

  const timetableWhere = student ? { sectionId: student.sectionId } : faculty ? { facultyId: faculty.id } : { semesterId: semester.id };
  const todayEntries = await prisma.timetableEntry.findMany({
    where: { ...timetableWhere, dayOfWeek },
    include: { subject: { include: { faculty: { include: { user: true } } } }, section: true },
    orderBy: { period: 'asc' },
  });

  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const toMinutes = (t: string) => Number(t.split(':')[0]) * 60 + Number(t.split(':')[1]);

  const todayClasses = todayEntries.map((e) => ({
    code: e.subject?.code ?? '—',
    name: e.subject?.name ?? e.label ?? 'Open session',
    who: e.subject ? (student ? (e.subject.faculty?.user.name ?? 'Unallocated') : `${e.section.name} · ${e.section.name}`) : 'Open session',
    room: e.room,
    start: e.startTime,
    end: e.endTime,
    live: minutesNow >= toMinutes(e.startTime) && minutesNow < toMinutes(e.endTime),
  }));

  const [departments, events, notifications] = await Promise.all([
    prisma.department.findMany({ orderBy: { code: 'asc' } }),
    prisma.event.findMany({ where: { date: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) } }, orderBy: { date: 'asc' }, take: 6 }),
    prisma.notification.findMany({ where: { recipientId: req.user!.sub }, orderBy: { createdAt: 'desc' }, take: 4 }),
  ]);

  const instituteAttendance = Number(
    (departments.reduce((sum, d) => sum + d.avgAttendance * d.studentCount, 0) / departments.reduce((sum, d) => sum + d.studentCount, 0)).toFixed(1),
  );

  const base = {
    periods: PERIODS,
    todayClasses,
    events: events.map((e) => ({ title: e.title, date: e.date, tag: e.tag, tone: e.tone })),
    feed: notifications.map((n) => ({ title: n.title, body: n.body, kind: n.kind, tone: n.tone, createdAt: n.createdAt })),
    departments: departments.map((d) => ({ code: d.code, name: d.name, attendance: d.avgAttendance, passPercentage: d.passPercentage, students: d.studentCount, faculty: d.facultyCount })),
    instituteAttendance,
  };

  if (student) {
    const [subjects, results, fees, assignments] = await Promise.all([
      subjectAttendanceFor(student.id, semester.id),
      prisma.semesterResult.findMany({ where: { studentId: student.id }, include: { semester: true }, orderBy: { semester: { number: 'asc' } } }),
      prisma.fee.findMany({ where: { studentId: student.id } }),
      prisma.assignment.findMany({ where: { sectionId: student.sectionId }, include: { submissions: { where: { studentId: student.id } } } }),
    ]);
    const held = subjects.reduce((sum, s) => sum + s.held, 0);
    const attended = subjects.reduce((sum, s) => sum + s.attended, 0);
    const exams = await prisma.exam.count({ where: { subject: { semesterId: semester.id } } });
    const nextExam = await prisma.exam.findFirst({ where: { subject: { semesterId: semester.id } }, orderBy: { date: 'asc' } });

    res.json({
      ...base,
      scope: role === 'PARENT' ? 'parent' : 'student',
      student: {
        name: student.user.name,
        firstName: student.user.name.split(' ')[0],
        registerNumber: student.registerNumber,
        section: `${student.department.code} ${student.section.semester.number}-${student.section.name}`,
      },
      attendance: { percentage: percentage(attended, held), attended, held, subjects },
      cgpa: cgpaFrom(results.map((r) => ({ gpa: r.gpa, credits: r.credits }))),
      gpaTrend: results.map((r) => ({ label: `Sem ${r.semester.number}`, gpa: r.gpa })),
      pendingAssignments: assignments.filter((a) => (a.submissions[0]?.status ?? 'PENDING') === 'PENDING').length,
      nextDue: assignments
        .filter((a) => (a.submissions[0]?.status ?? 'PENDING') === 'PENDING')
        .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0]?.dueDate ?? null,
      feeBalance: fees.filter((f) => f.status === 'PENDING').reduce((sum, f) => sum + f.amount, 0),
      feeDue: fees.find((f) => f.status === 'PENDING')?.dueDate ?? null,
      upcomingExams: exams,
      nextExam: nextExam ? { date: nextExam.date } : null,
      subjectsAtRisk: subjects.filter((s) => s.held > 0 && s.percentage < 75).length,
    });
    return;
  }

  if (role === 'FACULTY') {
    const subjects = await prisma.subject.findMany({ where: { facultyId: faculty?.id }, include: { attendance: true, timetable: true } });
    const sectionIds = [...new Set(subjects.flatMap((s) => s.timetable.map((t) => t.sectionId)))];
    const studentsTaught = await prisma.student.count({ where: { sectionId: { in: sectionIds } } });
    const pendingLeaves = await prisma.leaveRequest.count({ where: { status: 'PENDING' } });
    const toGrade = await prisma.submission.count({ where: { assignment: { facultyId: faculty?.id }, status: 'SUBMITTED' } });
    const held = subjects.flatMap((s) => s.attendance).filter((r) => countsInDenominator(r.mark)).length;
    const attended = subjects.flatMap((s) => s.attendance).filter((r) => countsAsPresent(r.mark)).length;

    res.json({
      ...base,
      scope: 'faculty',
      staff: { name: faculty?.user.name ?? '', department: faculty?.department.name ?? '' },
      subjectCount: subjects.length,
      studentsTaught,
      averageAttendance: percentage(attended, held),
      toGrade,
      pendingLeaves,
      sections: sectionIds.length,
    });
    return;
  }

  const [studentCount, facultyCount, pendingLeaves, fees] = await Promise.all([
    prisma.student.count(),
    prisma.faculty.count(),
    prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
    prisma.fee.findMany(),
  ]);
  const demand = fees.reduce((sum, f) => sum + f.amount, 0);
  const collected = fees.filter((f) => f.status === 'PAID').reduce((sum, f) => sum + f.amount, 0);
  const ownDepartment = departments.find((d) => d.code === 'CSE');

  res.json({
    ...base,
    scope: role === 'HOD' ? 'hod' : 'admin',
    staff: { name: (await prisma.user.findUnique({ where: { id: req.user!.sub } }))?.name ?? '' },
    department: ownDepartment
      ? { code: ownDepartment.code, name: ownDepartment.name, students: ownDepartment.studentCount, faculty: ownDepartment.facultyCount, attendance: ownDepartment.avgAttendance, passPercentage: ownDepartment.passPercentage }
      : null,
    institute: {
      students: departments.reduce((sum, d) => sum + d.studentCount, 0),
      faculty: departments.reduce((sum, d) => sum + d.facultyCount, 0),
      departments: departments.length,
      attendance: instituteAttendance,
      feeCollection: demand ? Number(((collected / demand) * 100).toFixed(1)) : 0,
    },
    seededStudents: studentCount,
    seededFaculty: facultyCount,
    pendingLeaves,
  });
});
