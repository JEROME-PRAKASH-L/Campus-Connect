import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../../config/env.js';
import type { SignArgs, SignedUpload, StorageDriver } from './storage.types.js';

let client: S3Client | null = null;

const s3 = (): S3Client => {
  client ??= new S3Client({
    region: env.storage.region,
    ...(env.storage.endpoint ? { endpoint: env.storage.endpoint } : {}),
    forcePathStyle: env.storage.forcePathStyle,
    ...(env.storage.accessKeyId && env.storage.secretAccessKey
      ? { credentials: { accessKeyId: env.storage.accessKeyId, secretAccessKey: env.storage.secretAccessKey } }
      : {}),
  });
  return client;
};

/**
 * Production driver. The API never proxies file bytes: it hands the browser a
 * short-lived presigned PUT scoped to one key, one content type and one length,
 * and stores only the resulting URL and metadata in PostgreSQL.
 */
export const s3Driver: StorageDriver = {
  name: 's3',
  sign: async ({ key, mimeType, sizeBytes }: SignArgs): Promise<SignedUpload> => {
    const command = new PutObjectCommand({
      Bucket: env.storage.bucket,
      Key: key,
      ContentType: mimeType,
      ContentLength: sizeBytes,
      ServerSideEncryption: 'AES256',
    });
    const uploadUrl = await getSignedUrl(s3(), command, { expiresIn: 900 });
    return {
      uploadUrl,
      headers: { 'content-type': mimeType },
      publicUrl: `${env.storage.publicBaseUrl}/${key}`,
    };
  },
  remove: async (key: string) => {
    await s3().send(new DeleteObjectCommand({ Bucket: env.storage.bucket, Key: key }));
  },
};
