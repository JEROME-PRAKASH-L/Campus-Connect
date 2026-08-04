import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { requireAuth, requireRole } from '../auth.js';
import { param } from '../params.js';
import { currentSemester } from '../context.js';

export const materialsRouter = Router();
materialsRouter.use(requireAuth);

materialsRouter.get('/', async (_req, res) => {
  const semester = await currentSemester();
  const materials = await prisma.studyMaterial.findMany({
    where: { subject: { semesterId: semester.id } },
    include: { subject: true, uploadedBy: true },
    orderBy: { createdAt: 'desc' },
  });
  const subjects = await prisma.subject.findMany({ where: { semesterId: semester.id }, orderBy: { code: 'asc' } });
  res.json({
    materials: materials.map((m) => ({
      id: m.id,
      title: m.title,
      kind: m.kind,
      size: m.size,
      downloads: m.downloads,
      uploadedBy: m.uploadedBy.name,
      uploadedOn: m.createdAt,
      subject: { id: m.subject.id, code: m.subject.code, shortName: m.subject.shortName },
    })),
    subjects: subjects.map((s) => ({ id: s.id, code: s.code, shortName: s.shortName })),
  });
});

materialsRouter.post('/', requireRole('FACULTY', 'HOD', 'ADMIN'), async (req, res) => {
  const parsed = z
    .object({
      title: z.string().trim().min(1, 'Give the material a title.'),
      subjectId: z.string().min(1),
      kind: z.enum(['PDF', 'PPTX', 'DOCX', 'VIDEO']).default('PDF'),
      size: z.string().default('2.4 MB'),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }
  const material = await prisma.studyMaterial.create({
    data: { ...parsed.data, uploadedById: req.user!.sub },
    include: { subject: { include: { timetable: true } } },
  });
  const sectionIds = [...new Set(material.subject.timetable.map((t) => t.sectionId))];
  const students = await prisma.student.findMany({ where: { sectionId: { in: sectionIds } } });
  await prisma.notification.createMany({
    data: students.map((s) => ({
      kind: 'ANNOUNCEMENT' as const,
      title: `New material — ${material.subject.code}`,
      body: material.title,
      tone: 'ACCENT' as const,
      route: 'materials',
      recipientId: s.userId,
      authorId: req.user!.sub,
    })),
  });
  res.status(201).json({ ok: true, id: material.id, notified: students.length });
});

materialsRouter.post('/:id/download', async (req, res) => {
  const material = await prisma.studyMaterial.update({
    where: { id: param(req, 'id') },
    data: { downloads: { increment: 1 } },
  });
  res.json({ ok: true, downloads: material.downloads });
});
