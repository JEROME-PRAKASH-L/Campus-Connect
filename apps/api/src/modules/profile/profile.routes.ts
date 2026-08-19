import { Router } from 'express';
import { prisma } from '../../database/prisma.js';
import { requireAuth } from '../../middleware/authentication.middleware.js';
import { facultyFor, resolveContextStudent } from '../../shared/context/request-context.js';
import { cgpaFrom, countsAsPresent, countsInDenominator, percentage } from '../../shared/utils/domain.js';

export const profileRouter = Router();
profileRouter.use(requireAuth);

const formatDate = (d: Date) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

profileRouter.get('/', async (req, res) => {
  const student = await resolveContextStudent(req);

  if (student) {
    const [records, results, parents, certificates] = await Promise.all([
      prisma.attendanceRecord.findMany({ where: { studentId: student.id } }),
      prisma.semesterResult.findMany({ where: { studentId: student.id } }),
      prisma.parent.findMany({ where: { wardId: student.id }, include: { user: true } }),
      prisma.certificate.findMany({ where: { studentId: student.id }, orderBy: { title: 'asc' } }),
    ]);
    const held = records.filter((r) => countsInDenominator(r.mark)).length;
    const attended = records.filter((r) => countsAsPresent(r.mark)).length;
    const guardian = parents[0];

    res.json({
      scope: 'student',
      name: student.user.name,
      subtitle: `${student.registerNumber} · ${student.course.degree} ${student.department.code} · Semester ${student.section.semester.number}, Section ${student.section.name}`,
      tags: [`${student.department.code} ${student.section.semester.number}-${student.section.name}`, student.residence, student.admissionQuota],
      photoUrl: student.photoUrl,
      attendance: percentage(attended, held),
      cgpa: cgpaFrom(results.map((r) => ({ gpa: r.gpa, credits: r.credits }))),
      creditsEarned: results.reduce((sum, r) => sum + r.credits, 0),
      arrears: results.reduce((sum, r) => sum + r.arrears, 0),
      fields: [
        { label: 'Register number', value: student.registerNumber },
        { label: 'Programme', value: `${student.course.degree} ${student.course.name}` },
        { label: 'Department', value: student.department.name },
        { label: 'Semester / Section', value: `Semester ${student.section.semester.number} · Section ${student.section.name}` },
        { label: 'Batch', value: student.batch },
        { label: 'Date of birth', value: formatDate(student.dateOfBirth) },
        { label: 'Blood group', value: student.bloodGroup },
        { label: 'Institute email', value: student.user.email },
        { label: 'Mobile', value: student.mobile },
        { label: 'Residence', value: student.residence },
        { label: 'Guardian', value: guardian ? `${guardian.user.name} (${guardian.relation})` : '—' },
        { label: 'Guardian mobile', value: guardian?.mobile ?? '—' },
        { label: 'Mentor', value: student.mentorName },
        { label: 'Admission quota', value: student.admissionQuota },
      ],
      certificates: certificates.map((c) => ({
        id: c.id,
        title: c.title,
        reference: c.reference,
        issuedOn: c.issuedOn,
        status: c.status,
      })),
    });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: req.user!.sub }, include: { department: true } });
  const faculty = await facultyFor(req.user!.sub);
  if (!user) {
    res.status(404).json({ error: 'Account no longer exists.' });
    return;
  }

  res.json({
    scope: 'staff',
    name: user.name,
    subtitle: `${user.extra} · ${user.department?.name ?? 'Registry'}`,
    tags: [user.roleLabel, user.department?.code ?? 'Registry', 'Full time'],
    photoUrl: null,
    fields: [
      { label: 'Staff ID', value: user.loginId },
      { label: 'Designation', value: faculty?.designation ?? user.extra },
      { label: 'Department', value: user.department?.name ?? 'Registry' },
      { label: 'Qualification', value: faculty?.qualification ?? 'Ph.D. Public Administration' },
      { label: 'Experience', value: `${faculty?.experienceYears ?? 26} years` },
      { label: 'Institute email', value: user.email },
      { label: 'Mobile', value: faculty?.mobile ?? '+91 98410 33001' },
      { label: 'Cabin', value: faculty?.cabin ?? 'Admin Block, Room 12' },
      { label: 'Date of joining', value: faculty ? formatDate(faculty.joinedOn) : '14 June 2015' },
    ],
    certificates: [],
  });
});
