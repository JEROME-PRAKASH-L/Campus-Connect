import { PrismaClient } from '@prisma/client';
import { env } from './env.js';

// On Vercel each warm serverless instance re-uses this module, and creating a
// fresh client per invocation would open a new connection pool every time and
// exhaust Postgres. Caching on globalThis keeps one client per instance; the
// pooled DATABASE_URL handles concurrency across instances.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// The URL is passed explicitly rather than left to the schema's
// env("DATABASE_URL"), so the Supabase-integration variable names resolved in
// env.ts work at runtime too.
const createClient = () => new PrismaClient({ datasources: { db: { url: env.databaseUrl } } });

// Construction is deferred to first use. Reading env.databaseUrl at import time
// would throw on a deployment with no database attached and take down the whole
// function — including the health check that is supposed to explain the
// problem. Requests never reach a query in that state anyway: the app's config
// guard answers first.
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = (globalForPrisma.prisma ??= createClient());
    const value = Reflect.get(client as object, property, client);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
