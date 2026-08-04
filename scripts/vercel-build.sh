#!/usr/bin/env bash
# Vercel build for the combined deployment: API serverless functions from api/
# plus the static frontend from apps/web/out.
set -euo pipefail

# Vercel's Supabase integration provisions POSTGRES_* rather than DATABASE_URL.
# Normalise here so the Prisma CLI and the seed — which read DATABASE_URL and
# DIRECT_URL directly — work whether the credentials were added by hand or by
# connecting Supabase to the project.
export DATABASE_URL="${DATABASE_URL:-${POSTGRES_PRISMA_URL:-${POSTGRES_URL:-}}}"
export DIRECT_URL="${DIRECT_URL:-${POSTGRES_URL_NON_POOLING:-$DATABASE_URL}}"

SCHEMA="apps/api/prisma/schema.prisma"

echo "==> Generating Prisma client"
npx --no-install prisma generate --schema "$SCHEMA"

if [ -z "$DATABASE_URL" ]; then
  # Don't fail the build: the frontend still deploys and renders. The API
  # functions will return a clear error until the database is connected.
  echo "::warning::No database connection string found (DATABASE_URL / POSTGRES_PRISMA_URL)."
  echo "    Connect Supabase to this Vercel project, or set DATABASE_URL, then redeploy."
  echo "    Skipping schema push and seed."
else
  echo "==> Pushing schema"
  npx --no-install prisma db push --schema "$SCHEMA" --skip-generate

  echo "==> Seeding if empty"
  npx --no-install tsx apps/api/prisma/ensure-seed.ts
fi

echo "==> Building frontend"
cd apps/web
STATIC_EXPORT=true npm run build
