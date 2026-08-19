import { Router } from 'express';
import { certificateCreateSchema, studentSelfUpdateSchema } from '@campus-connect/contracts';
import { prisma } from '../../database/prisma.js';
import { requireAuth } from '../../middleware/authentication.middleware.js';
import { requirePermission } from '../../middleware/authorization.middleware.js';
import { validate, validated } from '../../middleware/validation.middleware.js';
import { requireContextStudent } from '../../shared/context/request-context.js';
import { forbidden } from '../../shared/errors/http-error.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { recordAudit } from '../audit/audit.service.js';

/**
 * The slice of their own record a student may maintain.
 *
 * `studentSelfUpdateSchema` is `.strict()` and lists four fields; a request that
 * also carries `registerNumber`, `sectionId` or `departmentId` is rejected
 * outright rather than partially applied. The record itself is resolved from the
 * token, so there is no id in the payload to tamper with.
 */
export const profileEditRouter = Router();
profileEditRouter.use(requireAuth);

profileEditRouter.patch(
  '/',
  requirePermission('student:write-own'),
  validate(studentSelfUpdateSchema),
  asyncHandler(async (req, res) => {
    if (req.user!.role !== 'STUDENT') throw forbidden('Only a student can edit their own record here.');

    const student = await requireContextStudent(req);
    const input = validated<typeof studentSelfUpdateSchema>(req);

    const data = {
      ...(input.mobile !== undefined ? { mobile: input.mobile } : {}),
      ...(input.bloodGroup !== undefined ? { bloodGroup: input.bloodGroup } : {}),
      ...(input.residence !== undefined ? { residence: input.residence } : {}),
      ...(input.photoFileId !== undefined ? { photoFileId: input.photoFileId || null } : {}),
      updatedById: req.user!.sub,
    };

    const updated = await prisma.student.update({ where: { id: student.id }, data, include: { photoFile: { select: { url: true } } } });

    await recordAudit(req, {
      action: 'UPDATE',
      module: 'profile',
      entityType: 'Student',
      entityId: student.id,
      oldValues: { mobile: student.mobile, bloodGroup: student.bloodGroup, residence: student.residence, photoFileId: student.photoFileId },
      newValues: { mobile: updated.mobile, bloodGroup: updated.bloodGroup, residence: updated.residence, photoFileId: updated.photoFileId },
    });

    res.json({
      ok: true,
      profile: { mobile: updated.mobile, bloodGroup: updated.bloodGroup, residence: updated.residence, photoUrl: updated.photoFile?.url ?? updated.photoUrl ?? null },
    });
  }),
);

/** Students record their own certificates; the registry verifies them afterwards. */
profileEditRouter.post(
  '/certificates',
  requirePermission('student:write-own'),
  validate(certificateCreateSchema),
  asyncHandler(async (req, res) => {
    const student = await requireContextStudent(req);
    if (req.user!.role !== 'STUDENT') throw forbidden('Only a student can add a certificate to their own record.');

    const input = validated<typeof certificateCreateSchema>(req);
    const certificate = await prisma.certificate.create({
      data: {
        title: input.title,
        reference: input.reference,
        issuedOn: input.issuedOn ?? null,
        status: 'Submitted',
        studentId: student.id,
        fileId: input.fileId || null,
        createdById: req.user!.sub,
        updatedById: req.user!.sub,
      },
    });

    await recordAudit(req, { action: 'CREATE', module: 'profile', entityType: 'Certificate', entityId: certificate.id, newValues: { title: input.title, reference: input.reference } });

    res.status(201).json({ certificate: { id: certificate.id, title: certificate.title, reference: certificate.reference, issuedOn: certificate.issuedOn, status: certificate.status } });
  }),
);
