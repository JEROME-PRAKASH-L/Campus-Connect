# Local development

## What you need

- **Node.js 22** or newer (the workspace declares `engines.node >= 22`)
- **PostgreSQL 16** running locally, or a connection string to one
- npm 10 (ships with Node 22)

## First run

```bash
git clone https://github.com/JEROME-PRAKASH-L/Campus-Connect.git
cd Campus-Connect

# 1. Install every workspace from the root. There is one lockfile.
npm install

# 2. Configure the two applications.
cp .env.example apps/api/.env          # then edit DATABASE_URL and JWT_SECRET
echo 'NEXT_PUBLIC_API_BASE="http://localhost:4000"' > apps/web/.env.local

# 3. Create the database.
createdb campus_connect

# 4. Generate the Prisma client and push the schema.
npm run prisma:generate
npm run db:push

# 5. Load the demo data.
npm run db:seed

# 6. Start both applications.
npm run dev            # API on :4000, web on :3000
```

Open <http://localhost:3000>. The login screen lists the demo accounts and signs
you in with one click.

## Root scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Runs the API and the web app together |
| `npm run dev:api` | API only, on port 4000, with file watching |
| `npm run dev:web` | Web app only, on port 3000 |
| `npm run build` | Builds contracts, then the API, then the web app |
| `npm run typecheck` | Type-checks every workspace |
| `npm run lint` | ESLint over the web app |
| `npm test` | Runs the API and web test suites |
| `npm run prisma:generate` | Regenerates the Prisma client |
| `npm run db:push` | Applies the schema to the database |
| `npm run db:seed` | Wipes and reloads the demo data |
| `npm run start:api` | Runs the compiled API from `dist` |
| `npm run start:web` | Runs the production web build |

Anything scoped to one workspace takes `--workspace`:

```bash
npm run typecheck --workspace @campus-connect/api
npm test --workspace @campus-connect/web
```

## Demo accounts

Every demo account uses the password `demo1234`.

| Role | Login ID | Name |
| --- | --- | --- |
| Student | `21CSE042` | Donald Trump |
| Faculty | `FAC1180` | Vladimir Putin |
| HOD | `HOD204` | Kim Jong Un |
| Administrator | `ADM001` | Elon Musk |
| Parent | `PAR7042` | Errol Musk |

The seed is the only place demo data may live. Everything else the portal shows
is entered through a form and read back from PostgreSQL.

## Environment variables

All of them are validated by Zod in `apps/api/src/config/env.ts` when the process
starts, so a missing or malformed value fails immediately with a readable
message rather than surfacing later as a confusing error.

| Variable | Default | Notes |
| --- | --- | --- |
| `DATABASE_URL` | — | Required |
| `JWT_SECRET` | — | Required; at least 16 characters, 32 in production |
| `JWT_EXPIRY` | `12h` | |
| `PORT` | `4000` | |
| `CORS_ORIGINS` | `http://localhost:3000` | Comma-separated |
| `LOGIN_RATE_LIMIT_WINDOW_MS` | `900000` | 15 minutes |
| `LOGIN_RATE_LIMIT_MAX` | `10` | Per IP *and* per identifier |
| `API_RATE_LIMIT_WINDOW_MS` | `60000` | |
| `API_RATE_LIMIT_MAX` | `600` | |
| `STORAGE_DRIVER` | `local` | `local` or `s3` |
| `STORAGE_PUBLIC_BASE_URL` | `http://localhost:4000/files` | Where objects are read from |
| `S3_BUCKET` etc. | — | Required when `STORAGE_DRIVER=s3` |
| `NEXT_PUBLIC_API_BASE` | `http://localhost:4000` | Web app only |

Never commit a populated `.env`. `.gitignore` already covers `.env`,
`.env.local` and `.env*.local`, and CI fails the build if a `.env` file is ever
tracked.

## Working on the code

**Adding a backend module.** Create `apps/api/src/modules/<name>/` with
`<name>.routes.ts` and whatever else it needs — controller, service, repository,
schema, types, permissions. Mount it in `app.ts`. Keep the URL unchanged if you
are moving an existing endpoint.

**Adding a manageable entity.** Write a `*.resource.ts` descriptor, add it to
`modules/admin/admin.registry.ts`, then add the matching entry to
`apps/web/src/features/administration/config/resources.tsx`. The seven endpoints,
the table, the forms, pagination, CSV export, archiving and the audit trail all
follow from those two declarations.

**Adding a screen.** Create `apps/web/src/features/<name>/`, export the
component, register it in `features/screens.tsx` and add its route key to
`config/navigation.ts`.

**Adding a payload.** Put the Zod schema in `packages/contracts` so both ends
use the same object, then run `npm run build --workspace @campus-connect/contracts`
(or just `npm run typecheck`, which builds it first).

## Object storage in development

`STORAGE_DRIVER=local` writes uploads under `apps/api/.storage` (gitignored) and
serves them from `GET /files/*`. Nothing else needs to change: the browser
follows the same sign-then-PUT flow it uses against S3.

To point at a real bucket, set `STORAGE_DRIVER=s3` plus `S3_BUCKET`,
`S3_REGION` and credentials. Any S3-compatible service works — set `S3_ENDPOINT`
and `S3_FORCE_PATH_STYLE=true` for MinIO.

## Deploying the web app

`apps/web` is a Next.js app inside an npm workspace. A host must build it from
`apps/web`, not from the repository root — the root `package.json` is the
workspace manifest and declares no framework.

On Vercel that means **Project → Settings → Build & Deployment → Root Directory
= `apps/web`**, with *Include files outside the root directory* enabled so the
workspace root and `packages/*` are available. Nothing else needs configuring:
`apps/web`'s own `prebuild` compiles `@campus-connect/contracts` first, and
`apps/api`'s `postinstall` generates the Prisma client, so a plain
`npm install && npm run build` works from a clean checkout.

Set `NEXT_PUBLIC_API_BASE` in the host's environment to wherever the API is
reachable. It defaults to `http://localhost:4000`, which is only right for local
development.

`apps/api` is a long-running Express server and needs a Node host plus a
reachable PostgreSQL instance — it is not a serverless target. Deploy it
separately and point `NEXT_PUBLIC_API_BASE` and `CORS_ORIGINS` at each other.

## Troubleshooting

**`Invalid environment configuration`** — the message names the variable and
what is wrong with it. Check `apps/api/.env`.

**`Cannot find module '@campus-connect/contracts'`** — the package has not been
built. Run `npm run build --workspace @campus-connect/contracts`.

**Prisma types look stale after a schema change** — run
`npm run prisma:generate`.

**`No current semester configured`** — no `Semester` row has `isCurrent`. Run
`npm run db:seed`, or set one under Administration → Institution → Academic
years.
