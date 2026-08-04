import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { requireAuth, requireRole } from '../auth.js';
import { param } from '../params.js';
import { requireContextStudent } from '../context.js';

export const leaveRouter = Router();
leaveRouter.use(requireAuth);

const serialise = (l: {
  id: string;
  type: string;
  fromDate: Date;
  toDate: Date;
  days: number;
  reason: string;
  status: string;
  student: { registerNumber: string; user: { name: string } };
  decidedBy: { name: string } | null;
}) => ({
  id: l.id,
  type: l.type,
  fromDate: l.fromDate,
  toDate: l.toDate,
  days: l.days,
  reason: l.reason,
  status: l.status,
  student: l.student.user.name,
  registerNumber: l.student.registerNumber,
  decidedBy: l.decidedBy?.name ?? null,
});

leaveRouter.get('/', async (req, res) => {
  const role = req.user!.role;
  if (role === 'STUDENT' || role === 'PARENT') {
    const student = await requireContextStudent(req);
    const requests = await prisma.leaveRequest.findMany({
      where: { studentId: student.id },
      include: { student: { include: { user: true } }, decidedBy: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ scope: 'student', requests: requests.map(serialise) });
    return;
  }
  const requests = await prisma.leaveRequest.findMany({
    include: { student: { include: { user: true } }, decidedBy: true },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  });
  res.json({ scope: 'staff', requests: requests.map(serialise) });
});

const applySchema = z.object({
  type: z.enum(['CASUAL', 'MEDICAL', 'ON_DUTY']),
  fromDate: z.string().min(1),
  toDate: z.string().min(1),
  reason: z.string().trim().min(1, 'Give a reason for the advisor to decide on.'),
});

leaveRouter.post('/', requireRole('STUDENT'), async (req, res) => {
  const parsed = applySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }
  const student = await requireContextStudent(req);
  const from = new Date(parsed.data.fromDate);
  const to = new Date(parsed.data.toDate);
  if (to < from) {
    res.status(400).json({ error: 'The end date cannot be before the start date.' });
    return;
  }
  const days = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
  const request = await prisma.leaveRequest.create({
    data: { studentId: student.id, type: parsed.data.type, fromDate: from, toDate: to, days, reason: parsed.data.reason },
  });

  const advisors = await prisma.user.findMany({ where: { role: { in: ['FACULTY', 'HOD'] }, departmentId: student.departmentId } });
  await prisma.notification.createMany({
    data: advisors.map((a) => ({
      kind: 'LEAVE' as const,
      title: `Leave request — ${student.registerNumber}`,
      body: `${parsed.data.type.replace('_', ' ').toLowerCase()} leave for ${days} day(s).`,
      tone: 'ACCENT' as const,
      route: 'leave',
      recipientId: a.id,
      authorId: req.user!.sub,
    })),
  });

  res.status(201).json({ ok: true, id: request.id });
});

leaveRouter.post('/:id/decide', requireRole('FACULTY', 'HOD', 'ADMIN'), async (req, res) => {
  const parsed = z.object({ verdict: z.enum(['APPROVED', 'REJECTED']) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'A verdict of APPROVED or REJECTED is required.' });
    return;
  }
  const request = await prisma.leaveRequest.findUnique({ where: { id: param(req, 'id') }, include: { student: true } });
  if (!request) {
    res.status(404).json({ error: 'Leave request not found.' });
    return;
  }
  if (request.status !== 'PENDING') {
    res.status(400).json({ error: 'This request has already been decided.' });
    return;
  }
  const decider = await prisma.user.findUnique({ where: { id: req.user!.sub } });
  await prisma.$transaction([
    prisma.leaveRequest.update({
      where: { id: request.id },
      data: { status: parsed.data.verdict, decidedById: req.user!.sub },
    }),
    prisma.notification.create({
      data: {
        kind: 'LEAVE',
        title: `Leave ${parsed.data.verdict.toLowerCase()} — ${request.type.replace('_', ' ').toLowerCase()}`,
        body: `${parsed.data.verdict === 'APPROVED' ? 'Approved' : 'Rejected'} by ${decider?.name ?? 'the department'}.`,
        tone: parsed.data.verdict === 'APPROVED' ? 'OK' : 'BAD',
        route: 'leave',
        recipientId: request.student.userId,
        authorId: req.user!.sub,
      },
    }),
  ]);
  res.json({ ok: true });
});

leaveRouter.delete('/:id', requireRole('STUDENT'), async (req, res) => {
  const student = await requireContextStudent(req);
  const request = await prisma.leaveRequest.findFirst({ where: { id: param(req, 'id'), studentId: student.id } });
  if (!request) {
    res.status(404).json({ error: 'Leave request not found.' });
    return;
  }
  if (request.status !== 'PENDING') {
    res.status(400).json({ error: 'Only pending requests can be withdrawn.' });
    return;
  }
  await prisma.leaveRequest.delete({ where: { id: request.id } });
  res.json({ ok: true });
});
