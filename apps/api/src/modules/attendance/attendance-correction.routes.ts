import { Router } from 'express';
import { attendanceCorrectionSchema } from '@campus-connect/contracts';
import { prisma } from '../../database/prisma.js';
import { requireAuth } from '../../middleware/authentication.middleware.js';
import { requirePermission } from '../../middleware/authorization.middleware.js';
import { validate, validated } from '../../middleware/validation.middleware.js';
import { assertStudentAccess, assertSubjectAccess } from '../../shared/context/request-context.js';
import { ATTENDANCE_THRESHOLD } from '../../shared/constants/index.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { recordAudit } from '../audit/audit.service.js';
import { cumulativeFor } from './attendance.service.js';

/**
 * Attendance corrections, reserved for HODs and administrators.
 *
 * A register entry is never deleted — the mark is amended in place, the reason
 * is stored on the row and the before/after pair goes to the audit trail, so the
 * correction itself is as auditable as the original entry.
 */
export const attendanceCorrectionRouter = Router();
attendanceCorrectionRouter.use(requireAuth);

attendanceCorrectionRouter.post(
  '/correction',
  requirePermission('attendance:correct'),
  validate(attendanceCorrectionSchema),
  asyncHandler(async (req, res) => {
    const input = validated<typeof attendanceCorrectionSchema>(req);
    await assertSubjectAccess(req, input.subjectId);
    await assertStudentAccess(req, input.studentId);

    const key = { studentId: input.studentId, subjectId: input.subjectId, date: input.date, period: input.period };
    const existing = await prisma.attendanceRecord.findUnique({ where: { studentId_subjectId_date_period: key } });

    const record = await prisma.attendanceRecord.upsert({
      where: { studentId_subjectId_date_period: key },
      create: { ...key, mark: input.mark, markedById: req.user!.sub, correctionReason: input.reason },
      update: { mark: input.mark, markedById: req.user!.sub, correctionReason: input.reason },
    });

    await recordAudit(req, {
      action: 'ATTENDANCE',
      module: 'attendance',
      entityType: 'AttendanceRecord',
      entityId: record.id,
      oldValues: existing ? { mark: existing.mark } : null,
      newValues: { mark: record.mark, reason: input.reason },
    });

    const percentage = await cumulativeFor(input.studentId, input.subjectId);
    res.json({ ok: true, percentage, belowThreshold: percentage < ATTENDANCE_THRESHOLD });
  }),
);
