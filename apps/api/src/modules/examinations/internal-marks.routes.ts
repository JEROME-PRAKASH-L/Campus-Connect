import { Router } from 'express';
import { internalMarksSchema } from '@campus-connect/contracts';
import { prisma } from '../../database/prisma.js';
import { requireAuth } from '../../middleware/authentication.middleware.js';
import { requirePermission } from '../../middleware/authorization.middleware.js';
import { validate, validated } from '../../middleware/validation.middleware.js';
import { assertSubjectAccess } from '../../shared/context/request-context.js';
import { gradeFor, internalTotal } from '../../shared/utils/domain.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { param } from '../../shared/utils/params.js';
import { recordAudit } from '../audit/audit.service.js';

/**
 * Internal assessment entry — IA1, IA2, assignment and practical marks.
 *
 * `assertSubjectAccess` is the ownership rule: faculty may only enter marks for
 * subjects allocated to them, an HOD only within their department, an
 * administrator anywhere. The subject is taken from the URL and checked against
 * the token; nothing in the body can widen the caller's reach.
 */
export const internalMarksRouter = Router();
internalMarksRouter.use(requireAuth);

internalMarksRouter.get(
  '/:subjectId/internal-marks',
  requirePermission('marks:read'),
  asyncHandler(async (req, res) => {
    const subjectId = param(req, 'subjectId');
    await assertSubjectAccess(req, subjectId);

    const subject = await prisma.subject.findUniqueOrThrow({ where: { id: subjectId } });
    const entry = await prisma.timetableEntry.findFirst({ where: { subjectId } });
    const students = await prisma.student.findMany({
      where: entry ? { sectionId: entry.sectionId } : { departmentId: subject.departmentId },
      include: { user: { select: { name: true } }, marks: { where: { subjectId } } },
      orderBy: { registerNumber: 'asc' },
    });

    res.json({
      subject: { id: subject.id, code: subject.code, name: subject.name, kind: subject.kind },
      students: students.map((s) => {
        const mark = s.marks[0] ?? null;
        const total = internalTotal(subject.kind, mark);
        return {
          id: s.id,
          name: s.user.name,
          registerNumber: s.registerNumber,
          internal1: mark?.internal1 ?? null,
          internal2: mark?.internal2 ?? null,
          assignment: mark?.assignment ?? null,
          practical: mark?.practical ?? null,
          total,
          grade: gradeFor(total),
        };
      }),
    });
  }),
);

internalMarksRouter.post(
  '/:subjectId/internal-marks',
  requirePermission('marks:write'),
  validate(internalMarksSchema),
  asyncHandler(async (req, res) => {
    const subjectId = param(req, 'subjectId');
    await assertSubjectAccess(req, subjectId);

    const input = validated<typeof internalMarksSchema>(req);
    if (input.subjectId !== subjectId) {
      res.status(400).json({ error: 'The subject in the payload does not match the one in the URL.' });
      return;
    }

    const before = await prisma.mark.findMany({ where: { subjectId, studentId: { in: input.marks.map((m) => m.studentId) } } });

    const saved = await prisma.$transaction(
      input.marks.map((m) => {
        const fields = {
          ...(m.internal1 !== undefined ? { internal1: m.internal1 } : {}),
          ...(m.internal2 !== undefined ? { internal2: m.internal2 } : {}),
          ...(m.assignment !== undefined ? { assignment: m.assignment } : {}),
          ...(m.practical !== undefined ? { practical: m.practical } : {}),
        };
        return prisma.mark.upsert({
          where: { studentId_subjectId: { studentId: m.studentId, subjectId } },
          create: { studentId: m.studentId, subjectId, ...fields },
          update: { ...fields, updatedById: req.user!.sub },
        });
      }),
    );

    await recordAudit(req, {
      action: 'MARKS',
      module: 'examinations',
      entityType: 'Mark',
      entityId: subjectId,
      oldValues: before,
      newValues: saved,
    });

    res.json({ ok: true, updated: saved.length });
  }),
);
