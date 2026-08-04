import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { requireAuth, requireRole } from '../auth.js';
import { param } from '../params.js';
import { currentSemester, resolveContextStudent } from '../context.js';
import { cgpaFrom } from '../domain.js';

export const calendarRouter = Router();
calendarRouter.use(requireAuth);

calendarRouter.get('/', async (_req, res) => {
  const events = await prisma.event.findMany({ orderBy: { date: 'asc' } });
  res.json({ events });
});

export const placementRouter = Router();
placementRouter.use(requireAuth);

placementRouter.get('/', async (req, res) => {
  const drives = await prisma.placementDrive.findMany({ orderBy: { driveDate: 'asc' }, include: { registrations: true } });
  const student = await resolveContextStudent(req);
  let cgpa = 0;
  let arrears = 0;
  if (student) {
    const results = await prisma.semesterResult.findMany({ where: { studentId: student.id } });
    cgpa = cgpaFrom(results.map((r) => ({ gpa: r.gpa, credits: r.credits })));
    arrears = results.reduce((sum, r) => sum + r.arrears, 0);
  }
  res.json({
    cgpa,
    drives: drives.map((d) => {
      const registered = student ? d.registrations.some((r) => r.studentId === student.id) : false;
      const eligible = !student || (cgpa >= d.minCgpa && (!d.noArrears || arrears === 0));
      return {
        id: d.id,
        company: d.company,
        role: d.role,
        ctc: d.ctc,
        driveDate: d.driveDate,
        eligibility: d.eligibility,
        minCgpa: d.minCgpa,
        status: registered ? 'Registered' : eligible ? 'Eligible' : 'Not eligible',
      };
    }),
  });
});

placementRouter.post('/:id/register', requireRole('STUDENT'), async (req, res) => {
  const student = await resolveContextStudent(req);
  if (!student) {
    res.status(404).json({ error: 'No student record linked to this account.' });
    return;
  }
  const drive = await prisma.placementDrive.findUnique({ where: { id: param(req, 'id') } });
  if (!drive) {
    res.status(404).json({ error: 'Drive not found.' });
    return;
  }
  const results = await prisma.semesterResult.findMany({ where: { studentId: student.id } });
  const cgpa = cgpaFrom(results.map((r) => ({ gpa: r.gpa, credits: r.credits })));
  const arrears = results.reduce((sum, r) => sum + r.arrears, 0);
  if (cgpa < drive.minCgpa || (drive.noArrears && arrears > 0)) {
    res.status(400).json({ error: `You need a CGPA of ${drive.minCgpa} for ${drive.company}. Yours is ${cgpa}.` });
    return;
  }
  await prisma.placementRegistration.upsert({
    where: { driveId_studentId: { driveId: drive.id, studentId: student.id } },
    create: { driveId: drive.id, studentId: student.id },
    update: {},
  });
  res.json({ ok: true });
});

placementRouter.delete('/:id/register', requireRole('STUDENT'), async (req, res) => {
  const student = await resolveContextStudent(req);
  if (!student) {
    res.status(404).json({ error: 'No student record linked to this account.' });
    return;
  }
  await prisma.placementRegistration.deleteMany({ where: { driveId: param(req, 'id'), studentId: student.id } });
  res.json({ ok: true });
});

export const searchRouter = Router();
searchRouter.use(requireAuth);

searchRouter.get('/', async (req, res) => {
  const parsed = z.object({ q: z.string().trim().min(1) }).safeParse(req.query);
  if (!parsed.success) {
    res.json({ results: [] });
    return;
  }
  const q = parsed.data.q;
  const semester = await currentSemester();
  const [subjects, students, faculty] = await Promise.all([
    prisma.subject.findMany({
      where: { semesterId: semester.id, OR: [{ name: { contains: q, mode: 'insensitive' } }, { code: { contains: q, mode: 'insensitive' } }] },
      include: { faculty: { include: { user: true } } },
      take: 4,
    }),
    prisma.student.findMany({
      where: { OR: [{ user: { name: { contains: q, mode: 'insensitive' } } }, { registerNumber: { contains: q, mode: 'insensitive' } }] },
      include: { user: true, section: true, department: true },
      take: 4,
    }),
    prisma.faculty.findMany({
      where: { user: { name: { contains: q, mode: 'insensitive' } } },
      include: { user: true, department: true },
      take: 4,
    }),
  ]);

  res.json({
    results: [
      ...subjects.map((s) => ({ kind: 'Subject', label: `${s.code} · ${s.name}`, sub: s.faculty?.user.name ?? 'Unallocated', route: 'academics' })),
      ...students.map((s) => ({
        kind: 'Student',
        label: s.user.name,
        sub: `${s.registerNumber} · ${s.department.code} · Section ${s.section.name}`,
        route: req.user!.role === 'STUDENT' ? 'profile' : 'people',
      })),
      ...faculty.map((f) => ({ kind: 'Faculty', label: f.user.name, sub: `${f.designation} · ${f.department.code}`, route: req.user!.role === 'STUDENT' ? 'academics' : 'people' })),
    ].slice(0, 8),
  });
});

export const reportsRouter = Router();
reportsRouter.use(requireAuth, requireRole('FACULTY', 'HOD', 'ADMIN'));

reportsRouter.get('/', async (_req, res) => {
  const departments = await prisma.department.findMany({ orderBy: { code: 'asc' } });
  const defaulters = await prisma.student.count({ where: { attendance: { some: {} } } });
  res.json({
    departments,
    institute: {
      attendance: Number(
        (departments.reduce((sum, d) => sum + d.avgAttendance * d.studentCount, 0) / departments.reduce((sum, d) => sum + d.studentCount, 0)).toFixed(1),
      ),
      passPercentage: Number(
        (departments.reduce((sum, d) => sum + d.passPercentage * d.studentCount, 0) / departments.reduce((sum, d) => sum + d.studentCount, 0)).toFixed(1),
      ),
      studentsTracked: defaulters,
    },
    reports: [
      { title: 'Attendance summary', description: 'Section-wise attendance with shortage lists', cadence: 'Monthly' },
      { title: 'Academic performance', description: 'Subject-wise pass percentage and grade spread', cadence: 'Per semester' },
      { title: 'Faculty workload', description: 'Contact hours against the departmental guideline', cadence: 'Monthly' },
      { title: 'Fee collection', description: 'Demand, collection and outstanding by department', cadence: 'Weekly' },
      { title: 'Placement summary', description: 'Offers, packages and recruiter participation', cadence: 'Annual' },
      { title: 'Defaulters list', description: 'Students below 75% attendance in any subject', cadence: 'Weekly' },
    ],
  });
});
