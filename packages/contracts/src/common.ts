import { z } from 'zod';

export const RECORD_STATUSES = ['ACTIVE', 'ARCHIVED'] as const;
export type RecordStatus = (typeof RECORD_STATUSES)[number];

/** Lifecycle columns every master-data record carries. */
export type AuditedRecord = {
  id: string;
  status: RecordStatus;
  archivedAt: string | null;
  createdById: string | null;
  updatedById: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApiErrorBody = {
  error: string;
  /** Present when a Zod schema rejected the payload; keyed by dotted field path. */
  fieldErrors?: Record<string, string>;
};

export type OkResponse = { ok: true };

export const idSchema = z.string().trim().min(1, 'A record is required.');

/**
 * A required string. The `required_error` matters: when the key is missing from
 * the payload altogether — which is what an untouched form field looks like once
 * empty values are stripped — Zod would otherwise report a bare "Required"
 * instead of naming the field.
 */
export const nonEmpty = (label: string, max = 200) =>
  z
    .string({ required_error: `${label} is required.`, invalid_type_error: `${label} is required.` })
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} must be ${max} characters or fewer.`);

export const optionalText = (max = 400) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v ?? '');

export const emailSchema = z
  .string({ required_error: 'An email address is required.', invalid_type_error: 'An email address is required.' })
  .trim()
  .toLowerCase()
  .email('Enter a valid email address.');

export const phoneSchema = z
  .string({ required_error: 'A phone number is required.', invalid_type_error: 'A phone number is required.' })
  .trim()
  .min(6, 'Enter a valid phone number.')
  .max(20, 'Enter a valid phone number.')
  .regex(/^[+0-9 ()-]+$/, 'A phone number may only contain digits, spaces and + ( ) -');

export const passwordSchema = z
  .string({ required_error: 'A password is required.', invalid_type_error: 'A password is required.' })
  .min(10, 'Use at least 10 characters.')
  .max(200, 'Use 200 characters or fewer.');

/** Accepts either a `yyyy-mm-dd` field or a full ISO timestamp and yields a Date. */
export const dateSchema = (label = 'A date') =>
  z
    .string({ required_error: `${label} is required.`, invalid_type_error: `${label} is required.` })
    .trim()
    .min(1, `${label} is required.`)
    .refine((value) => !Number.isNaN(Date.parse(value)), `${label} must be a valid date.`)
    .transform((value) => new Date(value));

export const timeSchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use 24-hour HH:MM.');

export const moneySchema = z.coerce
  .number({ required_error: 'An amount is required.', invalid_type_error: 'Enter an amount in rupees.' })
  .int('Enter a whole rupee amount.')
  .min(0, 'Cannot be negative.')
  .max(100_000_000);
