import { readFileSync, writeFileSync } from 'node:fs';

const schemaSourcePath = new URL('./schema.prisma', import.meta.url);
const schemaOutputPath = new URL('./schema.sqlite.prisma', import.meta.url);
const seedSourcePath = new URL('./seed.ts', import.meta.url);
const seedOutputPath = new URL('./seed.sqlite.ts', import.meta.url);

const schemaSource = readFileSync(schemaSourcePath, 'utf8');
const datasourcePattern = /datasource db \{[\s\S]*?\n\}/;
if (!datasourcePattern.test(schemaSource)) throw new Error('Could not locate the datasource block.');

writeFileSync(
  schemaOutputPath,
  schemaSource.replace(
    datasourcePattern,
    `datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}`,
  ),
  'utf8',
);

const seedSource = readFileSync(seedSourcePath, 'utf8');
const option = ', skipDuplicates: true';
const occurrences = seedSource.split(option).length - 1;
if (occurrences !== 1) throw new Error(`Expected one skipDuplicates option, found ${occurrences}.`);

// The normal seed wipes the database first, so the option is unnecessary for
// the temporary SQLite copy. The original PostgreSQL seed remains unchanged.
writeFileSync(seedOutputPath, seedSource.replace(option, ''), 'utf8');
console.log('Generated temporary SQLite schema and seed.');
