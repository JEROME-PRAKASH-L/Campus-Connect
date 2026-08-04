#!/usr/bin/env bash
set -euo pipefail

export DATABASE_URL="${DATABASE_URL:-${POSTGRES_PRISMA_URL:-${POSTGRES_URL:-}}}"
export DIRECT_URL="${DIRECT_URL:-${POSTGRES_URL_NON_POOLING:-$DATABASE_URL}}"

POSTGRES_SCHEMA="apps/api/prisma/schema.prisma"
SQLITE_SCHEMA="apps/api/prisma/schema.sqlite.prisma"

if [ -z "$DATABASE_URL" ]; then
  echo "==> No persistent database configured — building seeded SQLite demo"
  node apps/api/prisma/prepare-sqlite-demo.mjs
  rm -f apps/api/prisma/seed.db
  export DATABASE_URL="file:./seed.db"
  export DIRECT_URL="$DATABASE_URL"

  npx --no-install prisma generate --schema "$SQLITE_SCHEMA"
  npx --no-install prisma db push --schema "$SQLITE_SCHEMA" --skip-generate
  npx --no-install tsx -e "import('./apps/api/prisma/seed.sqlite.ts').then(({ seed }) => seed()).catch((error) => { console.error(error); process.exit(1); })"
else
  echo "==> Generating PostgreSQL Prisma client"
  npx --no-install prisma generate --schema "$POSTGRES_SCHEMA"
  echo "==> Pushing PostgreSQL schema"
  npx --no-install prisma db push --schema "$POSTGRES_SCHEMA" --skip-generate
  echo "==> Seeding PostgreSQL if empty"
  npx --no-install tsx apps/api/prisma/ensure-seed.ts
fi

if ! grep -q "StudyMaterialInclude" apps/api/node_modules/.prisma/client/index.d.ts 2>/dev/null; then
  echo "Prisma client was not generated into apps/api/node_modules — aborting." >&2
  exit 1
fi

echo "==> Building frontend"
cd apps/web
NEXT_PUBLIC_API_BASE= STATIC_EXPORT=true npm run build
