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
cp .env.example .env          # set DATABASE_URL and a real JWT_SECRET
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

## Scripts

Both apps: `npm run dev`, `npm run build`, `npm run typecheck`.
API also has `npm run seed` and `npm run prisma:push`.
