'use client';

import type { SignUploadResponse, UploadPurpose } from '@campus-connect/contracts';
import type { UploadedFile } from '@campus-connect/ui';
import { API_BASE, post } from './client';
import { ApiError } from './errors';
import { getToken } from './token';

/**
 * Two steps, never one: ask the API to sign an upload for this exact purpose,
 * type and size, then PUT the bytes to the URL it returns. The file itself never
 * passes through the application server, and only its URL and metadata are
 * persisted.
 */
export const uploadFile = async (file: File, purpose: UploadPurpose): Promise<UploadedFile> => {
  const signed = await post<SignUploadResponse>('/api/uploads/sign', {
    purpose,
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
  });

  const token = getToken();
  const response = await fetch(signed.uploadUrl, {
    method: 'PUT',
    headers: {
      ...signed.headers,
      // The local development driver authenticates the PUT; a presigned S3 URL
      // carries its own signature and ignores this header.
      ...(signed.uploadUrl.startsWith(API_BASE) && token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: file,
  });

  if (!response.ok) throw new ApiError('The file could not be uploaded. Try again.', response.status);

  return { fileId: signed.fileId, url: signed.publicUrl, fileName: file.name, sizeBytes: file.size, mimeType: file.type };
};
