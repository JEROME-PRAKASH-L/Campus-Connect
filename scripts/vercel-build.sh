#!/usr/bin/env bash
# Vercel build for the combined deployment: API serverless functions from api/
# plus the static frontend from apps/web/out.
set -euo pipefail

# Vercel's Supabase integration provisions POSTGRES_* rather than DATABASE_URL.
# Normalise here so Prisma works whether credentials were added by hand or by
# connecting Supabase to the project.
export DATABASE_URL="${DATABASE_URL:-${POSTGRES_PRISMA_URL:-${POSTGRES_URL:-}}}"
export DIRECT_URL="${DIRECT_URL:-${POSTGRES_URL_NON_POOLING:-$DATABASE_URL}}"

POSTGRES_SCHEMA="apps/api/prisma/schema.prisma"
SQLITE_SCHEMA="apps/api/prisma/schema.sqlite.prisma"

if [ -z "$DATABASE_URL" ]; then
  echo "==> No persistent database configured — building seeded SQLite demo"
  node apps/api/prisma/prepare-sqlite-schema.mjs
  rm -f apps/api/prisma/seed.db

  # A relative SQLite URL is resolved from the schema directory, producing
  # apps/api/prisma/seed.db. The generated client has the same models and API as
  # the PostgreSQL client, so the existing Express routes need no changes.
  export DATABASE_URL="file:./seed.db"
  export DIRECT_URL="$DATABASE_URL"

  npx --no-install prisma generate --schema "$SQLITE_SCHEMA"
  npx --no-install prisma db push --schema "$SQLITE_SCHEMA" --skip-generate
  npx --no-install tsx apps/api/prisma/seed.ts
else
  echo "==> Generating PostgreSQL Prisma client"
  npx --no-install prisma generate --schema "$POSTGRES_SCHEMA"

  echo "==> Pushing PostgreSQL schema"
  npx --no-install prisma db push --schema "$POSTGRES_SCHEMA" --skip-generate

  echo "==> Seeding PostgreSQL if empty"
  npx --no-install tsx apps/api/prisma/ensure-seed.ts
fi

# The API imports @prisma/client from apps/api/node_modules. Abort rather than
# deploying a function compiled against Prisma's placeholder types.
if ! grep -q "StudyMaterialInclude" apps/api/node_modules/.prisma/client/index.d.ts 2>/dev/null; then
  echo "Prisma client was not generated into apps/api/node_modules — aborting." >&2
  exit 1
fi

echo "==> Building frontend"
cd apps/web
# Empty means same-origin /api requests for the combined Vercel deployment.
NEXT_PUBLIC_API_BASE= STATIC_EXPORT=true npm run build
