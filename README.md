# DMI Campus Connect

A College ERP and Learning Management Portal for DMI College of Engineering —
admissions, attendance, examinations, results, fees, learning materials and
placements, for five roles across six departments.

Built from the Claude Design handoff in `design-handoff/`, which is preserved
verbatim as the visual reference. The Classic look — navy rail, accent-ruled
panels, Manrope — is what ships.

> `design-handoff/` is **reference-only**. It is not built, not linted, not
> deployed, and it must not be modified.

## Layout

```
Campus-Connect/
├── .github/workflows/ci.yml
├── apps/
│   ├── api/          Express 5 · Prisma · PostgreSQL · JWT · bcrypt · Zod
│   └── web/          Next.js 16 App Router · React 19 · TypeScript · Tailwind 4
├── packages/
│   ├── contracts/    Roles, the permission matrix, pagination, shared Zod schemas
│   ├── ui/           Form controls, dialogs and feedback primitives
│   └── config/       Shared TypeScript and ESLint configuration
├── docs/             architecture · database · api · roles-and-permissions · development
├── design-handoff/   The original Claude Design export — reference only
├── package.json      npm workspaces: apps/* and packages/*
├── package-lock.json One lockfile for the whole workspace
└── tsconfig.base.json
```

### Inside `apps/api`

```
src/
├── app.ts · server.ts        app construction is separate from listening
├── config/env.ts             every variable validated by Zod at startup
├── database/prisma.ts
├── middleware/               authentication · authorization · validation
│                             · audit · error · not-found · rate-limit
├── shared/                   constants · context · errors · resource
│                             · storage · types · utils
└── modules/                  auth · dashboard · profile · people · attendance
                              · timetable · academics · assignments · examinations
                              · results · fees · leave · materials · notifications
                              · calendar · placements · reports · search
                              · admin · departments · programmes · academic-years
                              · sections · subjects · students · faculty · parents
                              · users · settings · support · remarks · uploads · audit
```

### Inside `apps/web`

```
src/
├── app/                 layout.tsx and a four-line page.tsx
├── providers/           Theme · Session · Navigation · Feedback · Notifications
├── components/          layout/ · forms/ · tables/ · feedback/ · ui/
├── features/            one folder per screen, plus administration/
├── config/              navigation.ts · permissions.ts
├── hooks/               useResource · useFormOptions · useNow · useViewportWidth
├── lib/                 api/{client,token,errors,uploads} · validation · utilities
└── types/
```

## Getting started

You need Node 22 and PostgreSQL 16.

```bash
npm install                                   # one install, from the root
cp .env.example apps/api/.env                 # set DATABASE_URL and JWT_SECRET
echo 'NEXT_PUBLIC_API_BASE="http://localhost:4000"' > apps/web/.env.local

createdb campus_connect
npm run prisma:generate
npm run db:push
npm run db:seed

npm run dev                                   # API :4000 · web :3000
```

Full instructions, including object storage and troubleshooting, are in
[`docs/development.md`](docs/development.md).

## Root commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Runs the API and the web app together |
| `npm run dev:api` / `npm run dev:web` | One at a time |
| `npm run build` | Builds contracts, then the API, then the web app |
| `npm run typecheck` | Type-checks every workspace |
| `npm run lint` | ESLint over the web app |
| `npm test` | Runs both test suites |
| `npm run prisma:generate` | Regenerates the Prisma client |
| `npm run db:push` | Applies the schema |
| `npm run db:seed` | Wipes and reloads the demo data |

## Roles

| Role | What they do |
| --- | --- |
| **Student** | Their own record: attendance, results, fees, submissions, leave, placements, profile |
| **Faculty** | Registers, internal marks, assignments, materials, announcements, remarks — for their allocated subjects only |
| **HOD** | Their department's subjects, allocations, timetable, corrections, approvals and reports |
| **Administrator** | Institution-wide master data, finance, accounts, settings and the audit trail |
| **Parent** | Read-only on their linked ward, plus contact-update and support requests |

The full matrix is in
[`docs/roles-and-permissions.md`](docs/roles-and-permissions.md). It lives in one
file, `packages/contracts/src/permissions.ts`, that both the API and the web app
read — a visible button and a permitted endpoint cannot disagree.

## Demo accounts

Every demo account uses the password `demo1234`. They are listed on the login
screen and sign you in with one click.

| Role | Login ID | Name |
| --- | --- | --- |
| Student | `21CSE042` | Donald Trump |
| Faculty | `FAC1180` | Vladimir Putin |
| HOD | `HOD204` | Kim Jong Un |
| Administrator | `ADM001` | Elon Musk |
| Parent | `PAR7042` | Errol Musk |

## Data entry

Everything the portal shows is entered through a form and stored in PostgreSQL.
The one exception is `prisma/seed.ts`, which exists so a fresh clone has
something to look at.

Each write follows the same path:

```
form → Zod in the browser → API → JWT verified → role and permission checked
     → Zod again → controller → service → repository → PostgreSQL
     → audit entry → response → the table reloads
```

Role, department and record ownership are always derived from the signed token,
never from the request body.

Administrators manage institution information, departments, degree programmes,
academic years and semesters, sections, subjects, students, faculty, HOD
assignments, parent accounts, user roles, the timetable, fee categories and
assignments, payments, examinations, events, placement companies and drives, and
system settings — each with search, filters, sorting, pagination, CSV export and
an archive workflow.

## Data model

`apps/api/prisma/schema.prisma` covers Users, Students, Faculty, Parents,
Departments, Courses, Semesters, Sections, Subjects, Timetables, Attendance,
Assignments, Submissions, Marks, Results, Exams, Fees, Payments, Leave requests,
Study materials, Notifications, Events, Certificates and Placement drives, plus
AuditLog, Setting, StoredFile, SupportRequest, StudentRemark, FeeCategory and
Company.

### Computed, not stored

Every figure the UI shows is derived from rows at request time:

- **Attendance %** — on-duty counts as present; medical leave leaves the
  denominator (`apps/api/src/shared/utils/domain.ts`).
- **CGPA** — the credit-weighted mean of the semester GPAs.
- **Internal totals and grades** — the IA average blended with assignment and
  practical marks, banded to O/A+/A/B+/B/C/RA.
- **Fee balances, submission counts, pass percentages** — aggregated per request.

Saving a register recalculates every affected student and raises a shortage
notification for anyone below 75%.

## Security

JWT authentication with bcrypt-hashed passwords; role-based access control from
a single shared matrix; record ownership and department-level scoping derived
from the token; Zod validation on both ends with `.strict()` schemas against
mass assignment; rate limiting on sign-in, keyed per IP *and* per identifier;
`helmet` security headers; explicit CORS; file-type and size validation before
any upload is signed; central error handling that never leaks internals; and an
audit trail over every create, update, archive, approval, payment, marks entry
and attendance correction.

Documents and images go to object storage — S3-compatible in production, a local
directory in development. PostgreSQL holds only the URL and the metadata.

## Documentation

- [`docs/architecture.md`](docs/architecture.md) — how a request flows from the
  browser to PostgreSQL and back
- [`docs/database.md`](docs/database.md) — the schema, lifecycle columns and what
  is computed rather than stored
- [`docs/api.md`](docs/api.md) — every endpoint, by module
- [`docs/roles-and-permissions.md`](docs/roles-and-permissions.md) — the full
  permission matrix
- [`docs/development.md`](docs/development.md) — local setup and troubleshooting
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — branch, commit and pull-request
  conventions
