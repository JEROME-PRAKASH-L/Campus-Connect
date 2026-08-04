import { PrismaClient } from '@prisma/client';
import { env } from './env.js';

// On Vercel each warm serverless instance re-uses this module, and creating a
// fresh client per invocation would open a new connection pool every time and
// exhaust Postgres. Caching on globalThis keeps one client per instance; the
// pooled DATABASE_URL handles concurrency across instances.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  // The URL is passed explicitly rather than left to the schema's
  // env("DATABASE_URL"), so the Supabase-integration variable names resolved in
  // env.ts work at runtime too.
  new PrismaClient({ datasources: { db: { url: env.databaseUrl } } });

globalForPrisma.prisma = prisma;
