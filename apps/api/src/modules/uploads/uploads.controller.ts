import type { Request, Response } from 'express';
import { UPLOAD_RULES, type UploadPurpose } from '@campus-connect/contracts';
import { env } from '../../config/env.js';
import { badRequest, forbidden } from '../../shared/errors/http-error.js';
import { verifyLocalTicket, writeLocalObject } from '../../shared/storage/local.driver.js';
import { validated } from '../../middleware/validation.middleware.js';
import { param } from '../../shared/utils/params.js';
import { recordAudit } from '../audit/audit.service.js';
import { fileMetaById, reconcileSize, signUpload } from './uploads.service.js';
import type { signUploadSchema } from './uploads.schema.js';

export const postSignUpload = async (req: Request, res: Response) => {
  const input = validated<typeof signUploadSchema>(req);
  const result = await signUpload(input, req.user!.sub);
  await recordAudit(req, {
    action: 'CREATE',
    module: 'uploads',
    entityType: 'StoredFile',
    entityId: result.fileId,
    newValues: { fileName: input.fileName, purpose: input.purpose, sizeBytes: input.sizeBytes },
  });
  res.status(201).json(result);
};

export const getFileMeta = async (req: Request, res: Response) => {
  res.json({ file: await fileMetaById(param(req, 'id')) });
};

/**
 * Receiving endpoint for the local development driver only. The ticket is a
 * short-lived JWT naming exactly one key, one content type and one byte
 * ceiling, so it cannot be replayed against a different object. Production
 * deployments use S3 presigned PUTs and never reach this handler.
 */
export const putLocalContent = async (req: Request, res: Response) => {
  if (env.storage.driver !== 'local') throw forbidden('Direct uploads are not accepted by this deployment.');

  const ticket = typeof req.query.ticket === 'string' ? req.query.ticket : '';
  if (!ticket) throw badRequest('An upload ticket is required.');

  const claim = verifyLocalTicket(ticket);
  const contentType = req.headers['content-type'];
  if (contentType && !contentType.startsWith(claim.mimeType)) throw badRequest('The content type does not match the signed upload.');

  const rule = UPLOAD_RULES[claim.purpose as UploadPurpose];
  const ceiling = Math.min(claim.maxBytes, rule?.maxBytes ?? claim.maxBytes);

  const written = await writeLocalObject(claim.key, req, ceiling);
  await reconcileSize(claim.key, written);

  res.status(201).json({ ok: true, sizeBytes: written });
};
