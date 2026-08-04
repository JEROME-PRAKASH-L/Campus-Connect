import { readFileSync, writeFileSync } from 'node:fs';

const schemaSourcePath = new URL('./schema.prisma', import.meta.url);
const schemaOutputPath = new URL('./schema.sqlite.prisma', import.meta.url);
const seedSourcePath = new URL('./seed.ts', import.meta.url);
const seedOutputPath = new URL('./seed.sqlite.ts', import.meta.url);

const schemaSource = readFileSync(schemaSourcePath, 'utf8');
const datasourcePattern = /datasource db \{[\s\S]*?\n\}/;
if (!datasourcePattern.test(schemaSource)) {
  throw new Error('Could not locate the datasource block in schema.prisma.');
}

const sqliteDatasource = `datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}`;
writeFileSync(schemaOutputPath, schemaSource.replace(datasourcePattern, sqliteDatasource), 'utf8');

const seedSource = readFileSync(seedSourcePath, 'utf8');
const compatibilityOption = ', skipDuplicates: true';
const occurrences = seedSource.split(compatibilityOption).length - 1;
if (occurrences !== 1) {
  throw new Error(`Expected one skipDuplicates option in seed.ts, found ${occurrences}.`);
}

// Prisma's SQLite connector does not expose createMany.skipDuplicates. The
// normal seed wipes the database first, so removing it is safe for this build-
// generated demo copy and leaves the PostgreSQL seed untouched.
writeFileSync(seedOutputPath, seedSource.replace(compatibilityOption, ''), 'utf8');

console.log('Generated SQLite schema and compatible temporary seed.');
