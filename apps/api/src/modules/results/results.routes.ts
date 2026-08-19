import { Router } from 'express';
import { prisma } from '../../database/prisma.js';
import { requireAuth } from '../../middleware/authentication.middleware.js';
import { currentSemester, requireContextStudent } from '../../shared/context/request-context.js';
import { cgpaFrom, gradeFor, internalTotal } from '../../shared/utils/domain.js';

export const resultsRouter = Router();
resultsRouter.use(requireAuth);

resultsRouter.get('/', async (req, res) => {
  if (req.user!.role === 'HOD' || req.user!.role === 'ADMIN' || req.user!.role === 'FACULTY') {
    const departments = await prisma.department.findMany({ orderBy: { passPercentage: 'desc' } });
    res.json({ scope: 'department', departments });
    return;
  }

  const student = await requireContextStudent(req);
  const semester = await currentSemester();

  const results = await prisma.semesterResult.findMany({
    where: { studentId: student.id },
    include: { semester: true, rows: true },
    orderBy: { semester: { number: 'asc' } },
  });

  const subjects = await prisma.subject.findMany({
    where: { semesterId: semester.id },
    include: { marks: { where: { studentId: student.id } } },
    orderBy: { code: 'asc' },
  });

  const internals = subjects.map((s) => {
    const mark = s.marks[0] ?? null;
    const total = internalTotal(s.kind, mark);
    return {
      code: s.code,
      name: s.name,
      internal1: mark?.internal1 ?? null,
      internal2: mark?.internal2 ?? null,
      assignment: mark?.assignment ?? null,
      practical: mark?.practical ?? null,
      total,
      grade: gradeFor(total),
    };
  });

  const provisionalGpa = internals.length
    ? Number(
        (
          internals.reduce((sum, i) => sum + (Object.entries({ O: 10, 'A+': 9, A: 8, 'B+': 7, B: 6, C: 5 }).find(([g]) => g === i.grade)?.[1] ?? 0), 0) /
          internals.length
        ).toFixed(2),
      )
    : 0;

  res.json({
    scope: 'student',
    cgpa: cgpaFrom(results.map((r) => ({ gpa: r.gpa, credits: r.credits }))),
    creditsEarned: results.reduce((sum, r) => sum + r.credits, 0),
    arrears: results.reduce((sum, r) => sum + r.arrears, 0),
    semesters: results.map((r) => ({
      number: r.semester.number,
      label: `Semester ${r.semester.number}`,
      gpa: r.gpa,
      credits: r.credits,
      publishedOn: r.publishedOn,
      rows: r.rows.map((row) => ({
        code: row.code,
        name: row.name,
        credits: row.credits,
        grade: row.grade,
        gradePoint: row.gradePoint,
        creditPoint: row.gradePoint * row.credits,
      })),
    })),
    currentSemester: { number: semester.number, label: `Semester ${semester.number} · internal`, provisionalGpa, rows: internals },
  });
});
