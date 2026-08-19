import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import type { UploadPurpose } from '@campus-connect/contracts';
import { prisma } from '../../database/prisma.js';
import { storage } from '../../shared/storage/index.js';
import { notFound } from '../../shared/errors/http-error.js';
import type { SignUploadInput } from './uploads.schema.js';

const FOLDER: Record<UploadPurpose, string> = {
  STUDENT_PHOTO: 'students/photos',
  STUDY_MATERIAL: 'materials',
  SUBMISSION: 'submissions',
  CERTIFICATE: 'certificates',
  INSTITUTION_LOGO: 'institution',
};

/** Never reuse the client's file name as a key — it is attacker-controlled. */
const keyFor = (purpose: UploadPurpose, fileName: string) => {
  const ext = extname(fileName).toLowerCase().replace(/[^.a-z0-9]/g, '').slice(0, 10);
  return `${FOLDER[purpose]}/${randomUUID()}${ext}`;
};

/**
 * Records the intent to upload and hands back a scoped ticket. The metadata row
 * exists before the bytes do, so an abandoned upload leaves a traceable record
 * rather than an orphaned object.
 */
export const signUpload = async (input: SignUploadInput, userId: string) => {
  const key = keyFor(input.purpose, input.fileName);
  const signed = await storage.sign({ key, mimeType: input.mimeType, sizeBytes: input.sizeBytes, purpose: input.purpose });

  const file = await prisma.storedFile.create({
    data: {
      key,
      url: signed.publicUrl,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      purpose: input.purpose,
      uploadedById: userId,
    },
  });

  return { fileId: file.id, uploadUrl: signed.uploadUrl, publicUrl: signed.publicUrl, headers: signed.headers };
};

export const fileMetaById = async (id: string) => {
  const file = await prisma.storedFile.findUnique({ where: { id } });
  if (!file) throw notFound('File not found.');
  return {
    id: file.id,
    url: file.url,
    key: file.key,
    fileName: file.fileName,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    purpose: file.purpose,
    createdAt: file.createdAt.toISOString(),
  };
};

/** Corrects the recorded size once the local driver knows what actually landed. */
export const reconcileSize = (key: string, sizeBytes: number) => prisma.storedFile.updateMany({ where: { key }, data: { sizeBytes } });
