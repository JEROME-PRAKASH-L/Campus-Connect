import 'dotenv/config';

const firstSet = (...keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = process.env[key];
    if (value) return value;
  }
  return undefined;
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

const jwtSecret = process.env.JWT_SECRET;

/**
 * Everything missing that the API needs in order to serve requests.
 *
 * Collected rather than thrown, because throwing here would happen while the
 * module is still loading and take the whole serverless function down — every
 * route, including /health, would return an opaque 500. Instead the app reports
 * these on /api/health and answers other routes with a 503 that names them.
 */
export const configErrors: string[] = [
  databaseUrl
    ? null
    : 'No database connection string. Connect Supabase to this project, or set DATABASE_URL.',
  jwtSecret ? null : 'JWT_SECRET is not set. Add a long random string — tokens cannot be signed without one.',
].filter((message): message is string => message !== null);

export const isConfigured = configErrors.length === 0;

const require_ = (value: string | undefined, name: string): string => {
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
};

export const env = {
  port: Number(process.env.PORT ?? 4000),
  // Getters, so an unconfigured deployment fails at the point of use — behind
  // the guard below — rather than at import time.
  get databaseUrl(): string {
    return require_(databaseUrl, 'DATABASE_URL');
  },
  get jwtSecret(): string {
    return require_(jwtSecret, 'JWT_SECRET');
  },
  jwtExpiry: process.env.JWT_EXPIRY ?? '12h',
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
};
