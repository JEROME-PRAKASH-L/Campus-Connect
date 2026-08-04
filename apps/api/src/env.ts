import 'dotenv/config';

const firstSet = (...keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = process.env[key];
    if (value) return value;
  }
  return undefined;
};

const required = (value: string | undefined, message: string): string => {
  if (!value) throw new Error(message);
  return value;
};

/**
 * Connection string for ordinary queries.
 *
 * Vercel's Supabase integration provisions its own variable names rather than
 * DATABASE_URL, so those are accepted too — connecting Supabase to the project
 * is then enough on its own, with no connection string to copy by hand.
 * POSTGRES_PRISMA_URL is the pooled connection with the pgbouncer flag already
 * applied, which is what serverless functions need.
 */
export const databaseUrl = firstSet('DATABASE_URL', 'POSTGRES_PRISMA_URL', 'POSTGRES_URL');

/**
 * Connection used for schema changes only. DDL cannot run over a transaction
 * pooler, so this prefers a direct/session connection and falls back to the
 * pooled one, which is still fine for a database already matching the schema.
 */
export const directUrl = firstSet('DIRECT_URL', 'POSTGRES_URL_NON_POOLING', 'DATABASE_URL', 'POSTGRES_URL');

export const env = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required(
    databaseUrl,
    'No database connection string. Set DATABASE_URL, or connect Supabase to this Vercel project so POSTGRES_PRISMA_URL is provisioned.',
  ),
  jwtSecret: required(
    process.env.JWT_SECRET,
    'JWT_SECRET is not set. Generate a long random string and add it as an environment variable — tokens cannot be signed without one.',
  ),
  jwtExpiry: process.env.JWT_EXPIRY ?? '12h',
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
};
