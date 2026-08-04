# DMI Campus Connect

A college/university management system — Smart College ERP & Learning Platform for DMI College of Engineering.

Built from the Claude Design handoff in `design-handoff/`, which is preserved verbatim as the visual
reference. The Classic look (navy rail, accent-ruled panels, Manrope) is implemented; the prototype's
Blueprint and Console alternates were dropped by request.

## What's here

```
apps/
  api/    Express 5 + Prisma + PostgreSQL — JWT auth, role-based routes, seed data
  web/    Next.js 16 (App Router) + TypeScript + Tailwind 4 — the five role dashboards
design-handoff/
  README.md, chats/, project/   The original Claude Design export
```

## Roles and modules

Five roles, each with its own sidebar and dashboard:

| Role | Modules |
| --- | --- |
| Student | Dashboard, Profile, Attendance, Timetable, Academics, Assignments, Examinations, Results, Fees, Leave, Materials, Notifications, Calendar, Placement, Settings |
| Faculty | …plus People and Reports; Attendance becomes the four-state register |
| HOD | Department overview, People, Attendance monitoring, Academics (allocation), Reports, approvals |
| Admin | Institute overview, People (incl. Admissions), Fees management, Reports, all monitoring |
| Parent | Read-only view of the linked ward: attendance, results, fees, timetable, examinations |

## Running it locally

You need Node 22+ and a PostgreSQL 16 database.

```bash
# 1. Database
createdb campus_connect

# 2. API
cd apps/api
cp .env.example .env          # set DATABASE_URL, DIRECT_URL and a real JWT_SECRET
npm install
npx prisma db push            # create the schema
npm run seed                  # realistic demo data
npm run dev                   # http://localhost:4000

# 3. Web (second terminal)
cd apps/web
cp .env.example .env.local    # NEXT_PUBLIC_API_BASE=http://localhost:4000
npm install
npm run dev                   # http://localhost:3000
```

### Demo accounts

Every demo account uses the password `demo1234`. They're listed on the login screen and sign you in
with one click.

| Role | Login ID | Name |
| --- | --- | --- |
| Student | `21CSE042` | Aarav Menon |
| Faculty | `FAC1180` | Prof. Kavitha Suresh |
| HOD | `HOD204` | Dr. Meera Rajan |
| Administrator | `ADM001` | Dr. S. Venkatesh |
| Parent | `PAR7042` | Ramesh Menon |

## Data model

Prisma schema in `apps/api/prisma/schema.prisma` covers Users, Students, Faculty, Parents,
Departments, Courses, Semesters, Sections, Subjects, Timetables, Attendance, Assignments,
Submissions, Marks, Results, Exams, Fees, Payments, Leave requests, Study materials, Notifications,
Events, Certificates and Placement drives, with relations between them.

The seed builds one fully-populated section (CSE Semester 5, Section B — 16 students, 7 subjects,
a Mon–Sat timetable, ~5,700 attendance records, four published semesters of results, fees and
receipts) alongside institute-wide figures for the six departments.

### Computed, not hard-coded

Every figure the UI shows is derived from stored rows:

- **Attendance %** — from `AttendanceRecord`. On-duty counts as present; medical leave leaves the
  denominator (`apps/api/src/domain.ts`).
- **CGPA** — credit-weighted mean of semester GPAs.
- **Internal totals and grades** — IA average, assignment and practical marks blended per the
  design's formula, then banded to O/A+/A/B+/B/C/RA.
- **Fee balance, submission counts, pass percentages** — aggregated at request time.

Saving a register recalculates every affected student's percentage and raises a shortage
notification for anyone who drops below 75%.

## Auth

Email/register-number + password, bcrypt-hashed, exchanged for a JWT carrying the user's role.
Routes are guarded by `requireAuth` and `requireRole`; the student/parent routes resolve their
"context student" server-side, so a parent can only ever read their own ward's record.

For production, set a long random `JWT_SECRET`, put the API behind TLS, and set `CORS_ORIGINS` to
the web app's real origin.

## Deploying (Vercel + Supabase)

The whole app deploys as **one Vercel project**. The static frontend and the API
serverless functions are served from the same deployment, so the browser calls
`/api/...` on its own origin — no API base URL to configure and no CORS.

### 1. Import the repository

**vercel.com/new** → import this repo. Leave Root Directory at the repository
root; `vercel.json` drives the build:

- `api/[...slug].ts` becomes a catch-all serverless function wrapping the same
  Express app used locally, so every `/api/*` route is handled exactly as it is
  in development
- `apps/web` is built as a static export and published from `apps/web/out`

### 2. Connect the database

Either **connect Supabase to the project** from the Vercel dashboard, or add
`DATABASE_URL` by hand.

The Supabase integration provisions `POSTGRES_PRISMA_URL` and
`POSTGRES_URL_NON_POOLING` rather than `DATABASE_URL`, and both the API and the
build accept those names (`apps/api/src/env.ts`), so connecting it is enough —
there is no connection string to copy.

Setting it manually instead, from **Supabase → Connect → ORMs → Prisma**:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | transaction pooler URI (port `6543`) + `?pgbouncer=true&connection_limit=1&sslmode=require` |
| `DIRECT_URL` | session pooler URI (port `5432`) + `?sslmode=require` — optional; falls back to `DATABASE_URL` |

Runtime queries go through the transaction pooler because serverless functions
open many short-lived connections. Schema changes cannot run over that pooler,
which is what `DIRECT_URL` is for.

### 3. Set the one required secret

| Variable | Value |
| --- | --- |
| `JWT_SECRET` | a long random string — tokens cannot be signed without it |

### 4. Deploy

The build runs `prisma generate`, pushes the schema, then seeds. Seeding is
gated: it runs only when the database has no users, so the first deploy
populates the demo data and later deploys leave real data alone. Set
`FORCE_SEED=true` to reseed, which discards everything currently stored.

If no database is configured the build still succeeds and the frontend deploys —
it logs a warning and skips the schema push and seed, and the API returns a
clear error until a database is connected.

**Verify:** `/api/health` on the deployment should return `{"ok":true}`, then
sign in with a demo account.

### Running the two apps separately

The split layout still works — deploy `apps/api` and `apps/web` as their own
Vercel projects with those Root Directories, set `NEXT_PUBLIC_API_BASE` on the
web project to the API's URL and `CORS_ORIGINS` on the API to the web origin.
Nothing in the code assumes the combined layout; it is just fewer moving parts.

## Deploying the frontend to GitHub Pages

`.github/workflows/deploy-pages.yml` publishes the web app to GitHub Pages on
every push to `main`.

**Pages can only host the frontend.** It serves static files, so the Express API
and PostgreSQL still need a host elsewhere — the published site loads but cannot
sign in until it can reach an API.

The workflow turns Pages on itself (`actions/configure-pages` with
`enablement: true`), so there is no settings step. The only thing to set is:

1. **Settings → Secrets and variables → Actions → Variables**, add
   `NEXT_PUBLIC_API_BASE` pointing at the deployed API. The workflow logs a
   warning if it is missing.
2. Push to `main`, or run the workflow manually from the Actions tab.

The site is published at `https://<owner>.github.io/<repo>/`.

Because a project site lives under a sub-path, `GITHUB_PAGES=true` switches the
build to `output: 'export'` with a matching `basePath`. Next rewrites its own
bundles for that prefix but not plain `<img src>`, so `lib/asset.ts` applies it
to files served from `public/`. Both settings are opt-in: the default build, the
one Vercel runs, is unchanged.

## Continuous integration

`.github/workflows/ci.yml` typechecks and builds both apps on every push to
`main` and on every pull request. It needs no database — the placeholder
connection strings exist only so `prisma generate` can resolve its datasource
variables.

## Scripts

Both apps: `npm run dev`, `npm run build`, `npm run typecheck`.
API also has `npm run seed`, `npm run prisma:push` and `npm run vercel-build`.
