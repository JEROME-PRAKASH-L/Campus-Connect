import { z } from 'zod';

export const attendanceRegisterQuerySchema = z.object({
  subjectId: z.string().min(1),
  date: z.string().min(1),
  period: z.coerce.number().default(1),
});

export const saveAttendanceRegisterSchema = z.object({
  subjectId: z.string().min(1),
  date: z.string().min(1),
  period: z.number().int().min(1).max(7).default(1),
  marks: z
    .array(
      z.object({
        studentId: z.string().min(1),
        mark: z.enum(['PRESENT', 'ABSENT', 'ON_DUTY', 'LEAVE']),
      }),
    )
    .min(1),
});

export type AttendanceRegisterQuery = z.infer<typeof attendanceRegisterQuerySchema>;
export type SaveAttendanceRegisterInput = z.infer<typeof saveAttendanceRegisterSchema>;
