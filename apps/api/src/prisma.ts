import { copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { env, usingDemoDatabase } from './env.js';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const prepareDemoDatabase = () => {
  if (!usingDemoDatabase) return;

  const target = '/tmp/campus-connect.db';
  if (existsSync(target)) return;

  // Vercel bundles this build-generated seed file through vercel.json. The
  // deployed source tree is read-only, so copy it to writable /tmp before the
  // first query. Data persists for the life of the warm function instance.
  const seed = join(process.cwd(), 'apps/api/prisma/seed.db');
  copyFileSync(seed, target);
};

const createClient = () => {
  prepareDemoDatabase();
  return new PrismaClient({ datasources: { db: { url: env.databaseUrl } } });
};

// Construction is deferred to first use, allowing /api/health to load even if
// a non-Vercel local environment has not configured a database yet.
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = (globalForPrisma.prisma ??= createClient());
    const value = Reflect.get(client as object, property, client);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
