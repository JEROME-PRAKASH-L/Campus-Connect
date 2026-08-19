import { Router } from 'express';
import { paymentCreateSchema } from '@campus-connect/contracts';
import { prisma } from '../../database/prisma.js';
import { requireAuth } from '../../middleware/authentication.middleware.js';
import { requirePermission } from '../../middleware/authorization.middleware.js';
import { validate, validated } from '../../middleware/validation.middleware.js';
import { assertDepartmentAccess } from '../../middleware/authorization.middleware.js';
import { conflict, notFound } from '../../shared/errors/http-error.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { recordAudit } from '../audit/audit.service.js';

/**
 * Counter payments recorded by the finance office.
 *
 * The fee row, the receipt and the student's notification are written in one
 * transaction, so a receipt number never exists without the payment behind it.
 */
export const feePaymentRouter = Router();
feePaymentRouter.use(requireAuth);

const receiptNumber = () => `RCT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;

feePaymentRouter.post(
  '/payments',
  requirePermission('fee:write'),
  validate(paymentCreateSchema),
  asyncHandler(async (req, res) => {
    const input = validated<typeof paymentCreateSchema>(req);

    const fee = await prisma.fee.findUnique({ where: { id: input.feeId }, include: { payment: true, student: { select: { departmentId: true, userId: true } } } });
    if (!fee) throw notFound('Fee record not found.');
    assertDepartmentAccess(req, fee.student.departmentId);
    if (fee.payment) throw conflict('That head of fee is already settled.');

    const receipt = receiptNumber();
    const paidOn = input.paidOn ?? new Date();

    await prisma.$transaction([
      prisma.fee.update({ where: { id: fee.id }, data: { status: 'PAID', updatedById: req.user!.sub } }),
      prisma.payment.create({
        data: { feeId: fee.id, receiptNumber: receipt, amount: fee.amount, mode: input.mode, referenceName: input.referenceName ?? '', paidOn, createdById: req.user!.sub, updatedById: req.user!.sub },
      }),
      prisma.notification.create({
        data: {
          kind: 'FEES',
          title: `Payment received — ${fee.head}`,
          body: `Receipt ${receipt} issued for ₹${fee.amount.toLocaleString('en-IN')}.`,
          tone: 'OK',
          route: 'fees',
          recipientId: fee.student.userId,
          authorId: req.user!.sub,
        },
      }),
    ]);

    await recordAudit(req, {
      action: 'PAYMENT',
      module: 'fees',
      entityType: 'Payment',
      entityId: fee.id,
      newValues: { receipt, amount: fee.amount, mode: input.mode, head: fee.head },
    });

    res.status(201).json({ ok: true, receipt });
  }),
);
