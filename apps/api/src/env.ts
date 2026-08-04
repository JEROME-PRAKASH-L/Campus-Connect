import 'dotenv/config';

const firstSet = (...keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = process.env[key];
    if (value) return value;
  }
  return undefined;
};

const runningOnVercel = process.env.VERCEL === '1';
const configuredDatabaseUrl = firstSet('DATABASE_URL', 'POSTGRES_PRISMA_URL', 'POSTGRES_URL');

/**
 * Connection string for ordinary queries.
 *
 * A configured Supabase/PostgreSQL connection always takes priority. When the
 * combined Vercel demo has no database attached, the build bundles a seeded
 * SQLite file and each cold function instance copies it into writable /tmp.
 */
export const usingDemoDatabase = runningOnVercel && !configuredDatabaseUrl;
export const databaseUrl = configuredDatabaseUrl ?? (usingDemoDatabase ? 'file:/tmp/campus-connect.db' : undefined);

/**
 * Connection used for schema changes only. DDL cannot run over a transaction
 * pooler, so this prefers a direct/session connection. The SQLite demo does all
 * schema work during the build and simply reuses its local URL here.
 */
export const directUrl =
  firstSet('DIRECT_URL', 'POSTGRES_URL_NON_POOLING', 'DATABASE_URL', 'POSTGRES_URL') ?? databaseUrl;

const jwtSecret =
  process.env.JWT_SECRET ??
  (usingDemoDatabase ? 'campus-connect-vercel-demo-secret-replace-before-production' : undefined);

/** Everything missing that the API needs in order to serve requests. */
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
