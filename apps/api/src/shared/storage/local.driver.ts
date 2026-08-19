import { createWriteStream } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import { dirname, join, normalize, resolve, sep } from 'node:path';
import { pipeline } from 'node:stream/promises';
import type { Readable } from 'node:stream';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { badRequest, forbidden } from '../errors/http-error.js';
import type { SignArgs, SignedUpload, StorageDriver } from './storage.types.js';

const ROOT = resolve(process.cwd(), env.storage.localDir);

/** Rejects any key that would escape the storage root. */
export const resolveKey = (key: string): string => {
  const target = resolve(ROOT, normalize(key));
  if (target !== ROOT && !target.startsWith(ROOT + sep)) throw forbidden('Invalid storage key.');
  return target;
};

type UploadClaim = { key: string; mimeType: string; maxBytes: number; purpose: string };

export const signLocalTicket = (claim: UploadClaim) => jwt.sign(claim, env.jwtSecret, { expiresIn: '15m' });

export const verifyLocalTicket = (token: string): UploadClaim => {
  try {
    return jwt.verify(token, env.jwtSecret) as UploadClaim;
  } catch {
    throw forbidden('That upload ticket has expired. Start the upload again.');
  }
};

export const writeLocalObject = async (key: string, body: Readable, maxBytes: number): Promise<number> => {
  const target = resolveKey(key);
  await mkdir(dirname(target), { recursive: true });

  let written = 0;
  body.on('data', (chunk: Buffer) => {
    written += chunk.length;
    if (written > maxBytes) body.destroy(badRequest('The upload exceeded the size limit for this kind of file.'));
  });

  await pipeline(body, createWriteStream(target));
  return written;
};

/**
 * Development driver. Bytes land under `apps/api/.storage` (gitignored) and are
 * served back through `GET /files/*`. Production uses the S3 driver; nothing
 * above this layer knows which one is in play.
 */
export const localDriver: StorageDriver = {
  name: 'local',
  sign: async ({ key, mimeType, sizeBytes, purpose }: SignArgs): Promise<SignedUpload> => {
    const ticket = signLocalTicket({ key, mimeType, maxBytes: sizeBytes, purpose });
    return {
      uploadUrl: `${env.storage.publicBaseUrl.replace(/\/files$/, '')}/api/uploads/content?ticket=${encodeURIComponent(ticket)}`,
      headers: { 'content-type': mimeType },
      publicUrl: `${env.storage.publicBaseUrl}/${key}`,
    };
  },
  remove: async (key: string) => {
    await rm(resolveKey(key), { force: true });
  },
};

export const localStorageRoot = () => ROOT;
export const localObjectPath = (key: string) => join(ROOT, normalize(key));
