import { z } from 'zod';
import { UPLOAD_PURPOSES, UPLOAD_RULES, type UploadPurpose } from '@campus-connect/contracts';

export const signUploadSchema = z
  .object({
    purpose: z.enum(UPLOAD_PURPOSES),
    fileName: z.string().trim().min(1, 'A file name is required.').max(200),
    mimeType: z.string().trim().min(1).max(160),
    sizeBytes: z.coerce.number().int().min(1, 'The file is empty.'),
  })
  .strict()
  .superRefine((value, ctx) => {
    const rule = UPLOAD_RULES[value.purpose as UploadPurpose];
    if (!rule.mimeTypes.includes(value.mimeType)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['mimeType'], message: `That file type is not accepted for ${value.purpose.toLowerCase().replace('_', ' ')}.` });
    }
    if (value.sizeBytes > rule.maxBytes) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['sizeBytes'], message: `The file is larger than the ${Math.round(rule.maxBytes / 1024 / 1024)} MB limit for this kind of upload.` });
    }
  });

export type SignUploadInput = z.infer<typeof signUploadSchema>;
