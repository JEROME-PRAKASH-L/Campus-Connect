import 'dotenv/config';
import { z } from 'zod';

/**
 * Every environment variable the service reads, validated once at import time.
 * A missing or malformed value fails the process immediately rather than
 * surfacing as a confusing runtime error on the first request that needs it.
 */
const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),

    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required.'),

    JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters.'),
    JWT_EXPIRY: z.string().default('12h'),

    CORS_ORIGINS: z.string().default('http://localhost:3000'),

    LOGIN_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(15 * 60 * 1000),
    LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(10),
    API_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(60 * 1000),
    API_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(600),

    STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
    STORAGE_PUBLIC_BASE_URL: z.string().default('http://localhost:4000/files'),
    STORAGE_LOCAL_DIR: z.string().default('.storage'),
    S3_BUCKET: z.string().default(''),
    S3_REGION: z.string().default('ap-south-1'),
    S3_ENDPOINT: z.string().default(''),
    S3_ACCESS_KEY_ID: z.string().default(''),
    S3_SECRET_ACCESS_KEY: z.string().default(''),
    S3_FORCE_PATH_STYLE: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
  })
  .superRefine((value, ctx) => {
    if (value.STORAGE_DRIVER === 's3' && !value.S3_BUCKET) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['S3_BUCKET'], message: 'S3_BUCKET is required when STORAGE_DRIVER is "s3".' });
    }
    if (value.NODE_ENV === 'production' && value.JWT_SECRET.length < 32) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['JWT_SECRET'], message: 'Use a JWT_SECRET of at least 32 characters in production.' });
    }
  });

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const lines = parsed.error.issues.map((i) => `  • ${i.path.join('.') || '(root)'}: ${i.message}`);
  throw new Error(`Invalid environment configuration:\n${lines.join('\n')}`);
}

const raw = parsed.data;

export const env = {
  nodeEnv: raw.NODE_ENV,
  isProduction: raw.NODE_ENV === 'production',
  port: raw.PORT,
  databaseUrl: raw.DATABASE_URL,
  jwtSecret: raw.JWT_SECRET,
  jwtExpiry: raw.JWT_EXPIRY,
  corsOrigins: raw.CORS_ORIGINS.split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  rateLimit: {
    loginWindowMs: raw.LOGIN_RATE_LIMIT_WINDOW_MS,
    loginMax: raw.LOGIN_RATE_LIMIT_MAX,
    apiWindowMs: raw.API_RATE_LIMIT_WINDOW_MS,
    apiMax: raw.API_RATE_LIMIT_MAX,
  },
  storage: {
    driver: raw.STORAGE_DRIVER,
    publicBaseUrl: raw.STORAGE_PUBLIC_BASE_URL.replace(/\/$/, ''),
    localDir: raw.STORAGE_LOCAL_DIR,
    bucket: raw.S3_BUCKET,
    region: raw.S3_REGION,
    endpoint: raw.S3_ENDPOINT,
    accessKeyId: raw.S3_ACCESS_KEY_ID,
    secretAccessKey: raw.S3_SECRET_ACCESS_KEY,
    forcePathStyle: raw.S3_FORCE_PATH_STYLE,
  },
} as const;

export type Env = typeof env;
