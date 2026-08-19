import { Router } from 'express';
import { studentRemarkCreateSchema } from '@campus-connect/contracts';
import { prisma } from '../../database/prisma.js';
import { requireAuth } from '../../middleware/authentication.middleware.js';
import { requirePermission } from '../../middleware/authorization.middleware.js';
import { validate, validated } from '../../middleware/validation.middleware.js';
import { assertStudentAccess, assertSubjectAccess, resolveContextStudent } from '../../shared/context/request-context.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { recordAudit } from '../audit/audit.service.js';

export const remarksRouter = Router();
remarksRouter.use(requireAuth);

const serialize = (row: {
  id: string;
  category: string;
  body: string;
  createdAt: Date;
  student: { registerNumber: string; user: { name: string } };
  subject: { code: string } | null;
  author: { name: string };
}) => ({
  id: row.id,
  category: row.category,
  body: row.body,
  createdAt: row.createdAt,
  student: row.student.user.name,
  registerNumber: row.student.registerNumber,
  subject: row.subject?.code ?? null,
  author: row.author.name,
});

const INCLUDE = {
  student: { select: { registerNumber: true, user: { select: { name: true } } } },
  subject: { select: { code: true } },
  author: { select: { name: true } },
} as const;

/**
 * A student or parent sees only the remarks on their own record; staff see the
 * remarks they can reach. The student is resolved from the token, so a caller
 * cannot read someone else's file by guessing an id.
 */
remarksRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const role = req.user!.role;
    if (role === 'STUDENT' || role === 'PARENT') {
      const student = await resolveContextStudent(req);
      if (!student) {
        res.json({ remarks: [] });
        return;
      }
      const rows = await prisma.studentRemark.findMany({ where: { studentId: student.id, status: 'ACTIVE' }, include: INCLUDE, orderBy: { createdAt: 'desc' } });
      res.json({ remarks: rows.map(serialize) });
      return;
    }

    const studentId = typeof req.query.studentId === 'string' ? req.query.studentId : undefined;
    if (studentId) await assertStudentAccess(req, studentId);

    const rows = await prisma.studentRemark.findMany({
      where: { status: 'ACTIVE', ...(studentId ? { studentId } : {}), ...(req.user!.departmentId && role === 'HOD' ? { student: { departmentId: req.user!.departmentId } } : {}) },
      include: INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json({ remarks: rows.map(serialize) });
  }),
);

remarksRouter.post(
  '/',
  requirePermission('student:read'),
  validate(studentRemarkCreateSchema),
  asyncHandler(async (req, res) => {
    const input = validated<typeof studentRemarkCreateSchema>(req);
    await assertStudentAccess(req, input.studentId);
    if (input.subjectId) await assertSubjectAccess(req, input.subjectId);

    const row = await prisma.studentRemark.create({
      data: {
        studentId: input.studentId,
        subjectId: input.subjectId || null,
        category: input.category,
        body: input.body,
        authorId: req.user!.sub,
        createdById: req.user!.sub,
        updatedById: req.user!.sub,
      },
      include: INCLUDE,
    });
    await recordAudit(req, { action: 'CREATE', module: 'remarks', entityType: 'StudentRemark', entityId: row.id, newValues: serialize(row) });
    res.status(201).json({ remark: serialize(row) });
  }),
);
