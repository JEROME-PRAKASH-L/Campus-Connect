import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../database/prisma.js';
import { requireAuth } from '../../middleware/authentication.middleware.js';
import { currentSemester } from '../../shared/context/request-context.js';

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
