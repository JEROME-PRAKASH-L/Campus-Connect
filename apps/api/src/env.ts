import 'dotenv/config';

const required = (key: string, fallback?: string): string => {
  const value = process.env[key] ?? fallback;
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
};

export const env = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiry: process.env.JWT_EXPIRY ?? '12h',
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
};
