import { Router } from 'express';
import { prisma } from '../../database/prisma.js';
import { requireAuth } from '../../middleware/authentication.middleware.js';
import { requireRole } from '../../middleware/authorization.middleware.js';
import { param } from '../../shared/utils/params.js';
import { resolveContextStudent } from '../../shared/context/request-context.js';
import { cgpaFrom } from '../../shared/utils/domain.js';

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
