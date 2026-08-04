import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { requireAuth, requireRole } from '../auth.js';
import { cgpaFrom, countsAsPresent, countsInDenominator, percentage } from '../domain.js';

export const peopleRouter = Router();
peopleRouter.use(requireAuth, requireRole('FACULTY', 'HOD', 'ADMIN'));

peopleRouter.get('/students', async (req, res) => {
  const sectionName = typeof req.query.section === 'string' && req.query.section !== 'All sections' ? req.query.section.replace('Section ', '') : undefined;
  const students = await prisma.student.findMany({
    where: sectionName ? { section: { name: sectionName } } : {},
    include: {
      user: true,
      section: { include: { semester: true, course: true } },
      department: true,
      attendance: true,
      results: true,
      fees: true,
    },
    orderBy: { registerNumber: 'asc' },
  });

  res.json({
    students: students.map((s) => {
      const held = s.attendance.filter((r) => countsInDenominator(r.mark)).length;
      const attended = s.attendance.filter((r) => countsAsPresent(r.mark)).length;
      return {
        id: s.id,
        name: s.user.name,
        registerNumber: s.registerNumber,
        section: `${s.department.code} ${s.section.semester.number}-${s.section.name}`,
        attendance: percentage(attended, held),
        cgpa: cgpaFrom(s.results.map((r) => ({ gpa: r.gpa, credits: r.credits }))),
        fees: s.fees.some((f) => f.status === 'PENDING') ? 'Pending' : 'Cleared',
        mentor: s.mentorName,
        guardianMobile: s.mobile,
      };
    }),
  });
});

peopleRouter.get('/faculty', async (_req, res) => {
  const faculty = await prisma.faculty.findMany({
    include: { user: true, department: true, subjects: true, timetable: true },
    orderBy: { staffId: 'asc' },
  });
  res.json({
    faculty: faculty.map((f) => {
      const hours = f.timetable.length;
      const sections = new Set(f.timetable.map((t) => t.sectionId)).size;
      return {
        id: f.id,
        name: f.user.name,
        staffId: f.staffId,
        designation: f.designation,
        department: f.department.code,
        subjects: f.subjects.map((s) => s.code).join(', ') || '—',
        hours,
        sections,
        experience: f.experienceYears,
        load: hours > 18 ? 'Heavy' : hours < 14 ? 'Light' : 'Optimal',
      };
    }),
  });
});

peopleRouter.get('/summary', async (_req, res) => {
  const [students, faculty, departments, feeDefaulters] = await Promise.all([
    prisma.student.count(),
    prisma.faculty.count(),
    prisma.department.findMany(),
    prisma.student.count({ where: { fees: { some: { status: 'PENDING' } } } }),
  ]);
  const withAttendance = await prisma.student.findMany({ include: { attendance: true } });
  const belowThreshold = withAttendance.filter((s) => {
    const held = s.attendance.filter((r) => countsInDenominator(r.mark)).length;
    const attended = s.attendance.filter((r) => countsAsPresent(r.mark)).length;
    return held > 0 && percentage(attended, held) < 75;
  }).length;
  res.json({
    students,
    faculty,
    departments: departments.length,
    institutionalStudents: departments.reduce((sum, d) => sum + d.studentCount, 0),
    institutionalFaculty: departments.reduce((sum, d) => sum + d.facultyCount, 0),
    belowThreshold,
    feeDefaulters,
  });
});

const createUserSchema = z.object({
  name: z.string().trim().min(1, 'A full name is required.'),
  role: z.enum(['STUDENT', 'FACULTY', 'HOD', 'PARENT', 'ADMIN']),
  departmentCode: z.string().min(1),
  email: z.string().trim().email('Enter a valid email address.'),
});

peopleRouter.post('/', requireRole('ADMIN'), async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }
  const department = await prisma.department.findUnique({ where: { code: parsed.data.departmentCode } });
  if (!department) {
    res.status(400).json({ error: 'Unknown department.' });
    return;
  }
  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (existing) {
    res.status(409).json({ error: 'An account already exists for that email address.' });
    return;
  }
  const roleLabels: Record<string, string> = {
    STUDENT: 'Student',
    FACULTY: 'Faculty',
    HOD: 'Head of Dept.',
    ADMIN: 'Administrator',
    PARENT: 'Parent',
  };
  const prefix = parsed.data.role === 'STUDENT' ? '26' + department.code : parsed.data.role === 'PARENT' ? 'PAR' : 'STF';
  const loginId = `${prefix}${Math.floor(Math.random() * 9000) + 1000}`;
  const user = await prisma.user.create({
    data: {
      loginId,
      email: parsed.data.email.toLowerCase(),
      passwordHash: await bcrypt.hash('demo1234', 10),
      name: parsed.data.name,
      role: parsed.data.role,
      initials: parsed.data.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase(),
      roleLabel: roleLabels[parsed.data.role],
      departmentId: department.id,
    },
  });
  res.status(201).json({ ok: true, loginId: user.loginId });
});

peopleRouter.get('/admissions', requireRole('ADMIN'), async (_req, res) => {
  res.json({
    applications: [
      { name: 'Sanjay Krishnan', programme: 'B.E. CSE', score: '188 / 200', status: 'Verified' },
      { name: 'Meghna Iyer', programme: 'B.Tech IT', score: '181 / 200', status: 'Verified' },
      { name: 'Arjun Pillai', programme: 'B.E. ECE', score: '176 / 200', status: 'Documents pending' },
      { name: 'Rhea Thomas', programme: 'B.E. CSE', score: '192 / 200', status: 'Verified' },
      { name: 'Imran Qureshi', programme: 'B.E. MECH', score: '164 / 200', status: 'Documents pending' },
      { name: 'Divya Suresh', programme: 'MBA', score: '173 / 200', status: 'Interview scheduled' },
    ].map((a, i) => ({ ...a, reference: `APP-2026-${1000 + i}` })),
    open: 318,
    verified: 74,
  });
});
