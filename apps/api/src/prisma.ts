import { copyFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const DEMO_DATABASE_URL = 'file:/tmp/campus-connect.db';

// Vercel's deployed source filesystem is read-only, while /tmp is writable.
// The build creates a fully seeded SQLite database and bundles it with the API
// function. Each cold instance copies that seed into /tmp, after which normal
// writes such as attendance and leave requests work for the life of the warm
// instance. Configure Postgres to make data persistent across cold starts.
if (process.env.DATABASE_URL === DEMO_DATABASE_URL) {
  const target = '/tmp/campus-connect.db';
  if (!existsSync(target)) {
    const seed = fileURLToPath(new URL('../prisma/seed.db', import.meta.url));
    copyFileSync(seed, target);
  }
}

// On Vercel each warm serverless instance re-uses this module. Caching on
// globalThis keeps one Prisma client per instance and avoids opening a fresh
// connection for every request.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

globalForPrisma.prisma = prisma;
