import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { requireAuth, requireRole } from '../auth.js';
import { param } from '../params.js';

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

notificationsRouter.get('/', async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { recipientId: req.user!.sub },
    orderBy: { createdAt: 'desc' },
    take: 60,
  });
  res.json({
    notifications: notifications.map((n) => ({
      id: n.id,
      kind: n.kind,
      title: n.title,
      body: n.body,
      tone: n.tone,
      route: n.route,
      read: n.read,
      createdAt: n.createdAt,
    })),
    unread: notifications.filter((n) => !n.read).length,
  });
});

notificationsRouter.post('/:id/read', async (req, res) => {
  await prisma.notification.updateMany({
    where: { id: param(req, 'id'), recipientId: req.user!.sub },
    data: { read: true },
  });
  res.json({ ok: true });
});

notificationsRouter.post('/read-all', async (req, res) => {
  const { count } = await prisma.notification.updateMany({
    where: { recipientId: req.user!.sub, read: false },
    data: { read: true },
  });
  res.json({ ok: true, marked: count });
});

const audienceFilter = (audience: string) => {
  switch (audience) {
    case 'All faculty':
      return { role: { in: ['FACULTY' as const, 'HOD' as const] } };
    case 'Parents':
      return { role: 'PARENT' as const };
    case 'Entire institute':
      return {};
    default:
      return { role: 'STUDENT' as const };
  }
};

notificationsRouter.post('/announce', requireRole('FACULTY', 'HOD', 'ADMIN'), async (req, res) => {
  const parsed = z
    .object({
      title: z.string().trim().min(1, 'Give the announcement a title.'),
      body: z.string().trim().min(1, 'Write a short message.'),
      audience: z.string().default('CSE 5-B'),
      priority: z.enum(['Normal', 'High', 'Urgent']).default('Normal'),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }
  const recipients = await prisma.user.findMany({ where: audienceFilter(parsed.data.audience) });
  await prisma.notification.createMany({
    data: recipients.map((r) => ({
      kind: 'ANNOUNCEMENT' as const,
      title: parsed.data.title,
      body: parsed.data.body,
      tone: parsed.data.priority === 'Urgent' ? ('BAD' as const) : parsed.data.priority === 'High' ? ('WARN' as const) : ('ACCENT' as const),
      route: 'notifications',
      recipientId: r.id,
      authorId: req.user!.sub,
    })),
  });
  res.status(201).json({ ok: true, sent: recipients.length });
});
