import { PrismaClient } from '@prisma/client';

// On Vercel each warm serverless instance re-uses this module, and creating a
// fresh client per invocation would open a new connection pool every time and
// exhaust Postgres. Caching on globalThis keeps one client per instance; the
// pooled (pgbouncer) DATABASE_URL handles concurrency across instances.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

globalForPrisma.prisma = prisma;
