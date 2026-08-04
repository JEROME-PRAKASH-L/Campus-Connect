import { copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { env, usingDemoDatabase } from './env.js';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const prepareDemoDatabase = () => {
  if (!usingDemoDatabase) return;
  const target = '/tmp/campus-connect.db';
  if (existsSync(target)) return;
  copyFileSync(join(process.cwd(), 'apps/api/prisma/seed.db'), target);
};

const createClient = () => {
  prepareDemoDatabase();
  return new PrismaClient({ datasources: { db: { url: env.databaseUrl } } });
};

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = (globalForPrisma.prisma ??= createClient());
    const value = Reflect.get(client as object, property, client);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
