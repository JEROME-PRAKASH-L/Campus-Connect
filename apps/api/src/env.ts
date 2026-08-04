import 'dotenv/config';

const required = (key: string, fallback?: string): string => {
  const value = process.env[key] ?? fallback;
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
};

const runningOnVercel = process.env.VERCEL === '1';

// The unified demo deployment uses a seeded SQLite copy in Vercel's writable
// /tmp directory when no persistent Postgres connection has been configured.
// Supplying DATABASE_URL and DIRECT_URL keeps the original Supabase/Postgres
// deployment path unchanged.
const databaseUrl = required('DATABASE_URL', runningOnVercel ? 'file:/tmp/campus-connect.db' : undefined);
process.env.DATABASE_URL = databaseUrl;

export const env = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl,
  jwtSecret: required(
    'JWT_SECRET',
    runningOnVercel ? 'campus-connect-demo-jwt-secret-change-before-production' : undefined,
  ),
  jwtExpiry: process.env.JWT_EXPIRY ?? '12h',
  corsOrigins: (process.env.CORS_ORIGINS ?? (runningOnVercel ? '*' : 'http://localhost:3000'))
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
};
