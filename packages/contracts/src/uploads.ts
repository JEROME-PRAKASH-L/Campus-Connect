export const IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

export const DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'video/mp4',
] as const;

export const UPLOAD_PURPOSES = ['STUDENT_PHOTO', 'STUDY_MATERIAL', 'SUBMISSION', 'CERTIFICATE', 'INSTITUTION_LOGO'] as const;
export type UploadPurpose = (typeof UPLOAD_PURPOSES)[number];

export type UploadPurposeRule = {
  /** MIME types the object store will accept for this purpose. */
  mimeTypes: readonly string[];
  /** Hard ceiling in bytes, enforced before a signed URL is issued. */
  maxBytes: number;
};

const MB = 1024 * 1024;

export const UPLOAD_RULES: Record<UploadPurpose, UploadPurposeRule> = {
  STUDENT_PHOTO: { mimeTypes: IMAGE_MIME_TYPES, maxBytes: 2 * MB },
  STUDY_MATERIAL: { mimeTypes: DOCUMENT_MIME_TYPES, maxBytes: 64 * MB },
  SUBMISSION: { mimeTypes: [...DOCUMENT_MIME_TYPES, ...IMAGE_MIME_TYPES], maxBytes: 32 * MB },
  CERTIFICATE: { mimeTypes: ['application/pdf', ...IMAGE_MIME_TYPES], maxBytes: 8 * MB },
  INSTITUTION_LOGO: { mimeTypes: IMAGE_MIME_TYPES, maxBytes: 2 * MB },
};

/** Only the URL and this metadata are persisted; the bytes live in object storage. */
export type StoredFileMeta = {
  id: string;
  url: string;
  key: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  purpose: UploadPurpose;
  createdAt: string;
};

export type SignUploadResponse = {
  fileId: string;
  /** PUT the bytes here. Expires shortly after it is issued. */
  uploadUrl: string;
  /** Where the object will be readable from once the upload completes. */
  publicUrl: string;
  headers: Record<string, string>;
};
