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

The stack needs a Node server and a Postgres database, so it cannot run on
GitHub Pages. It deploys as **two Vercel projects from this one repository** —
they differ only by Root Directory — plus a Supabase database.

### 1. Database

Create a Supabase project. From **Connect → ORMs → Prisma** copy the two
connection strings it gives you:

- the **transaction pooler** URI (port `6543`) → `DATABASE_URL`
- the **session pooler** URI (port `5432`) → `DIRECT_URL`

Runtime queries go through the transaction pooler because serverless functions
open many short-lived connections. Schema changes cannot run over that pooler,
so `prisma db push` uses the session pooler instead.

### 2. API project

New Vercel project from this repo, **Root Directory `apps/api`**.

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | transaction pooler URI, with `?pgbouncer=true&connection_limit=1&sslmode=require` |
| `DIRECT_URL` | session pooler URI, with `?sslmode=require` |
| `JWT_SECRET` | a long random string |
| `CORS_ORIGINS` | the web app's origin, e.g. `https://campus-connect-web.vercel.app` |

`api/[...slug].ts` exports the Express app as a single catch-all serverless
function, so every `/api/*` route reaches the same routers used locally.

The build (`npm run vercel-build`) runs `prisma generate`, then `prisma db push`
to create the schema, then `prisma/ensure-seed.ts`. Seeding is gated: it runs
only when the database has no users, so the first deploy populates the demo data
and later deploys leave real data alone. Set `FORCE_SEED=true` to reseed — that
discards everything currently stored.

### 3. Web project

A second Vercel project from the same repo, **Root Directory `apps/web`**.

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_API_BASE` | the API project's URL, no trailing slash |

`NEXT_PUBLIC_*` values are baked in at build time, so changing this needs a
redeploy rather than just a restart.

### 4. Close the loop

The two projects reference each other, so set `CORS_ORIGINS` on the API once the
web URL exists and redeploy. Check `/api/health` on the API domain — it should
return `{"ok":true}` — then sign in with a demo account.

## Deploying the frontend to GitHub Pages

`.github/workflows/deploy-pages.yml` publishes the web app to GitHub Pages on
every push to `main`.

**Pages can only host the frontend.** It serves static files, so the Express API
and PostgreSQL still need a host elsewhere — the published site loads but cannot
sign in until it can reach an API.

1. **Settings → Pages → Source: GitHub Actions.**
2. **Settings → Secrets and variables → Actions → Variables**, add
   `NEXT_PUBLIC_API_BASE` pointing at the deployed API. The workflow logs a
   warning if it is missing.
3. Push to `main`, or run the workflow manually from the Actions tab.

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
