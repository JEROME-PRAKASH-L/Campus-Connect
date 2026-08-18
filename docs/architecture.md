# Campus Connect architecture

Campus Connect is a two-application npm workspace with a shared repository-level deployment entry.

## Runtime flow

```text
Browser
  -> Next.js web application
  -> /api request with bearer token
  -> Vercel catch-all function or local Express server
  -> authentication and role guards
  -> feature route
  -> feature service
  -> Prisma
  -> PostgreSQL/Supabase campus_connect schema
```

In production, `apps/web` is exported as static files and `api/[...slug].ts` exposes the Express
application as a Vercel serverless function. The frontend uses same-origin `/api/*` requests. In
local development, the web application runs on port 3000 and the API runs on port 4000.

## Repository boundaries

- `apps/web/src/features/` owns feature-specific UI, API calls, types, constants, and components.
- `apps/web/src/components/` owns UI shared by multiple features.
- `apps/api/src/modules/` owns feature-specific routes, schemas, services, and tests.
- `apps/api/src/routes/` contains routes that have not yet moved to the feature-module structure.
- `apps/api/prisma/` owns the data model and demo seed.
- `design-handoff/` is an immutable visual reference and is never built or deployed.

## Attendance pilot module

Attendance is the first feature organized under the module structure.

### Web

```text
features/attendance/
  AttendancePage.tsx
  api.ts
  constants.ts
  types.ts
  components/
    DepartmentAttendanceView.tsx
    FacultyAttendanceRegister.tsx
    StudentAttendanceView.tsx
```

### API

```text
modules/attendance/
  attendance.routes.ts
  attendance.schemas.ts
  attendance.schemas.test.ts
  attendance.service.ts
```

The public API remains unchanged:

- `GET /api/attendance`
- `GET /api/attendance/register`
- `POST /api/attendance/register`
- `GET /api/attendance/sessions`

Future modules should follow the same boundary in small, behavior-preserving pull requests.
