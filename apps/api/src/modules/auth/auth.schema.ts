import { z } from 'zod';
import { passwordSchema } from '@campus-connect/contracts';

export const loginSchema = z
  .object({
    loginId: z.string().trim().min(1, 'Enter your registration number, staff ID or email.'),
    password: z.string().min(1, 'Enter your password.'),
  })
  .strict();

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password.'),
    newPassword: passwordSchema,
  })
  .strict();
