/**
 * Deploy-time seeding.
 *
 * Runs as part of the API's Vercel build. The seed itself is destructive (it
 * wipes every table before rebuilding the demo data), so this wrapper only
 * fires it when the database is actually empty. That makes deploys idempotent:
 * the first one populates the database, later ones leave real data alone.
 *
 * Set FORCE_SEED=true to reseed anyway — it will discard existing data.
 */
import { PrismaClient } from '@prisma/client';
import { seed } from './seed.js';

const prisma = new PrismaClient();

const run = async () => {
  const force = process.env.FORCE_SEED === 'true';

  if (!force) {
    const existingUsers = await prisma.user.count();
    if (existingUsers > 0) {
      console.log(`Database already holds ${existingUsers} users — skipping seed.`);
      return;
    }
    console.log('Database is empty — seeding demo data…');
  } else {
    console.log('FORCE_SEED=true — reseeding and discarding existing data…');
  }

  await seed();
};

run()
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
