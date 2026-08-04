import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { requireAuth, signToken } from '../auth.js';

export const authRouter = Router();

const loginSchema = z.object({
  loginId: z.string().trim().min(1, 'Enter your registration number, staff ID or email.'),
  password: z.string().min(1, 'Enter your password.'),
});

const publicUser = (user: {
  id: string;
  loginId: string;
  name: string;
  email: string;
  role: string;
  initials: string;
  roleLabel: string;
  extra: string;
  department: { code: string; name: string } | null;
}) => ({
  id: user.id,
  loginId: user.loginId,
  name: user.name,
  email: user.email,
  role: user.role,
  initials: user.initials,
  roleLabel: user.roleLabel,
  extra: user.extra,
  department: user.department?.code ?? '—',
  departmentName: user.department?.name ?? '—',
});

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }
  const identifier = parsed.data.loginId.trim();
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ loginId: identifier.toUpperCase() }, { email: identifier.toLowerCase() }],
    },
    include: { department: true },
  });
  if (!user) {
    res.status(401).json({ error: 'No account found for that register number or staff ID.' });
    return;
  }
  if (!(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    res.status(401).json({ error: 'Incorrect password. Demo accounts use demo1234.' });
    return;
  }
  res.json({
    token: signToken({ sub: user.id, loginId: user.loginId, role: user.role }),
    user: publicUser(user),
  });
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.sub },
    include: { department: true },
  });
  if (!user) {
    res.status(404).json({ error: 'Account no longer exists.' });
    return;
  }
  res.json({ user: publicUser(user) });
});

authRouter.get('/demo-accounts', async (_req, res) => {
  const users = await prisma.user.findMany({
    where: { loginId: { in: ['21CSE042', 'FAC1180', 'HOD204', 'ADM001', 'PAR7042'] } },
    include: { department: true },
  });
  const order = ['STUDENT', 'FACULTY', 'HOD', 'ADMIN', 'PARENT'];
  res.json({
    accounts: users
      .sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role))
      .map((u) => ({ role: u.role, roleLabel: u.roleLabel, name: u.name, loginId: u.loginId })),
  });
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(10, 'Use at least 10 characters.'),
});

authRouter.post('/change-password', requireAuth, async (req, res) => {
  const parsed = passwordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }
  const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
  if (!user || !(await bcrypt.compare(parsed.data.currentPassword, user.passwordHash))) {
    res.status(400).json({ error: 'Current password is incorrect.' });
    return;
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 10) },
  });
  res.json({ ok: true });
});
