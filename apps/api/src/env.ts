import 'dotenv/config';

const firstSet = (...keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = process.env[key];
    if (value) return value;
  }
  return undefined;
};

const withCampusSchema = (value?: string): string | undefined => {
  if (!value || !/^postgres(?:ql)?:\/\//i.test(value)) return value;
  const url = new URL(value);
  if (!url.searchParams.has('schema')) url.searchParams.set('schema', 'campus_connect');
  return url.toString();
};

const runningOnVercel = process.env.VERCEL === '1';
const rawDatabaseUrl = firstSet('DATABASE_URL', 'POSTGRES_PRISMA_URL', 'POSTGRES_URL');
const configuredDatabaseUrl = withCampusSchema(rawDatabaseUrl);
const configuredDirectUrl = withCampusSchema(
  firstSet('DIRECT_URL', 'POSTGRES_URL_NON_POOLING', 'DATABASE_URL', 'POSTGRES_URL'),
);

export const usingDemoDatabase = runningOnVercel && !rawDatabaseUrl;
export const databaseUrl = configuredDatabaseUrl ?? (usingDemoDatabase ? 'file:/tmp/campus-connect.db' : undefined);
export const directUrl = configuredDirectUrl ?? databaseUrl;
export const databaseMode = usingDemoDatabase ? 'sqlite-demo' : configuredDatabaseUrl ? 'postgres' : 'unconfigured';

const jwtSecret =
  process.env.JWT_SECRET ??
  (usingDemoDatabase ? 'campus-connect-vercel-demo-secret-replace-before-production' : undefined);

export const configErrors: string[] = [
  databaseUrl ? null : 'No database connection string. Connect Supabase to this project, or set DATABASE_URL.',
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
