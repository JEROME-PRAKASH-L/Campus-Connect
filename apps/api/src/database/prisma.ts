import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';

/**
 * One client for the process. `tsx watch` re-imports modules on every change, so
 * the instance is parked on `globalThis` in development to avoid exhausting the
 * connection pool with orphaned clients.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.isProduction ? ['warn', 'error'] : ['warn', 'error'],
  });

if (!env.isProduction) globalForPrisma.prisma = prisma;

export const disconnectPrisma = () => prisma.$disconnect();

export type { Prisma } from '@prisma/client';
