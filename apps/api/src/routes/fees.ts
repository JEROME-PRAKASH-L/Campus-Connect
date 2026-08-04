import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { requireAuth, requireRole } from '../auth.js';
import { param } from '../params.js';
import { requireContextStudent } from '../context.js';

export const feesRouter = Router();
feesRouter.use(requireAuth);

const receiptNumber = () => `RCT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;

feesRouter.get('/', async (req, res) => {
  if (req.user!.role === 'ADMIN') {
    const departments = await prisma.department.findMany({ orderBy: { name: 'asc' } });
    const fees = await prisma.fee.findMany({ include: { student: true } });
    const byDepartment = departments.map((d) => {
      const own = fees.filter((f) => f.student.departmentId === d.id);
      const demand = own.reduce((sum, f) => sum + f.amount, 0);
      const collected = own.filter((f) => f.status === 'PAID').reduce((sum, f) => sum + f.amount, 0);
      return {
        code: d.code,
        name: d.name,
        demand,
        collected,
        percentage: demand ? Number(((collected / demand) * 100).toFixed(1)) : 0,
      };
    });
    const demand = byDepartment.reduce((sum, d) => sum + d.demand, 0);
    const collected = byDepartment.reduce((sum, d) => sum + d.collected, 0);
    res.json({
      scope: 'institute',
      departments: byDepartment,
      totals: { demand, collected, outstanding: demand - collected, percentage: demand ? Number(((collected / demand) * 100).toFixed(1)) : 0 },
      defaulters: await prisma.student.count({ where: { fees: { some: { status: 'PENDING' } } } }),
    });
    return;
  }

  const student = await requireContextStudent(req);
  const fees = await prisma.fee.findMany({
    where: { studentId: student.id },
    include: { payment: true },
    orderBy: { dueDate: 'asc' },
  });
  const total = fees.reduce((sum, f) => sum + f.amount, 0);
  const paid = fees.filter((f) => f.status === 'PAID').reduce((sum, f) => sum + f.amount, 0);

  res.json({
    scope: 'student',
    student: { name: student.user.name, registerNumber: student.registerNumber },
    fees: fees.map((f) => ({
      id: f.id,
      head: f.head,
      amount: f.amount,
      status: f.status,
      dueDate: f.dueDate,
      academicYear: f.academicYear,
      receipt: f.payment
        ? { number: f.payment.receiptNumber, paidOn: f.payment.paidOn, mode: f.payment.mode }
        : null,
    })),
    totals: { total, paid, balance: total - paid },
  });
});

feesRouter.post('/:id/pay', requireRole('STUDENT', 'PARENT'), async (req, res) => {
  const parsed = z.object({ mode: z.string().default('UPI'), referenceName: z.string().default('') }).safeParse(req.body);
  const student = await requireContextStudent(req);
  const fee = await prisma.fee.findFirst({ where: { id: param(req, 'id'), studentId: student.id }, include: { payment: true } });
  if (!fee) {
    res.status(404).json({ error: 'Fee record not found.' });
    return;
  }
  if (fee.status === 'PAID') {
    res.status(400).json({ error: 'This head of fee is already settled.' });
    return;
  }
  const receipt = receiptNumber();
  await prisma.$transaction([
    prisma.fee.update({ where: { id: fee.id }, data: { status: 'PAID' } }),
    prisma.payment.create({
      data: {
        feeId: fee.id,
        receiptNumber: receipt,
        amount: fee.amount,
        mode: parsed.success ? parsed.data.mode : 'UPI',
        referenceName: parsed.success ? parsed.data.referenceName : '',
        paidOn: new Date(),
      },
    }),
    prisma.notification.create({
      data: {
        kind: 'FEES',
        title: `Payment received — ${fee.head}`,
        body: `Receipt ${receipt} issued for ₹${fee.amount.toLocaleString('en-IN')}.`,
        tone: 'OK',
        route: 'fees',
        recipientId: student.userId,
      },
    }),
  ]);
  res.json({ ok: true, receipt });
});

feesRouter.post('/remind', requireRole('ADMIN'), async (req, res) => {
  const parsed = z.object({ departmentCode: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'A department is required.' });
    return;
  }
  const defaulters = await prisma.student.findMany({
    where: { department: { code: parsed.data.departmentCode }, fees: { some: { status: 'PENDING' } } },
  });
  await prisma.notification.createMany({
    data: defaulters.map((s) => ({
      kind: 'FEES' as const,
      title: 'Fee reminder',
      body: 'An outstanding head of fee is pending on your account. Settle it to avoid a late fee.',
      tone: 'WARN' as const,
      route: 'fees',
      recipientId: s.userId,
      authorId: req.user!.sub,
    })),
  });
  res.json({ ok: true, notified: defaulters.length });
});
