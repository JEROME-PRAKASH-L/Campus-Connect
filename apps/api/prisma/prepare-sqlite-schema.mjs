import { readFileSync, writeFileSync } from 'node:fs';

const sourcePath = new URL('./schema.prisma', import.meta.url);
const outputPath = new URL('./schema.sqlite.prisma', import.meta.url);
const source = readFileSync(sourcePath, 'utf8');

const datasourcePattern = /datasource db \{[\s\S]*?\n\}/;
if (!datasourcePattern.test(source)) {
  throw new Error('Could not locate the datasource block in schema.prisma.');
}

const sqliteDatasource = `datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}`;

writeFileSync(outputPath, source.replace(datasourcePattern, sqliteDatasource), 'utf8');
console.log('Generated prisma/schema.sqlite.prisma.');
