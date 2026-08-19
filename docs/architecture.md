# Architecture

Campus Connect is an npm-workspace monorepo holding two deployable applications
and three shared packages. Nothing is generated at build time from
`design-handoff/` — that folder is the original Claude Design export, kept
verbatim as the visual reference. It is not built, not linted and not deployed.

## The request path

Every screen in the portal is served by the same chain. Nothing skips a link.

```
browser
  │  React 19 screen renders; a form validates with a shared Zod schema
  ▼
apps/web  ·  src/lib/api/client.ts
  │  attaches the bearer token, normalises errors into ApiError
  ▼
apps/api  ·  src/app.ts
  │  helmet → CORS → rate limit → JSON body → audit context
  ▼
middleware/authentication.middleware.ts
  │  verifies the JWT, puts the claims on req.user
  ▼
middleware/authorization.middleware.ts
  │  requireRole / requirePermission, then department scope
  ▼
middleware/validation.middleware.ts
  │  parses the body with the SAME Zod object the browser used
  ▼
modules/<feature>/<feature>.controller.ts     HTTP in, HTTP out
  ▼
modules/<feature>/<feature>.service.ts        business rules
  ▼
modules/<feature>/<feature>.repository.ts     Prisma queries
  ▼
PostgreSQL
  │
  ├─ AuditLog row written for the change
  ▼
JSON response → the web app reloads the affected table or dashboard
```

Two properties of that chain matter more than the rest:

**The same schema runs on both ends.** `packages/contracts` exports one Zod
object per payload. The browser parses with it for instant field-level feedback;
the API parses with it again before anything reaches Prisma. They cannot drift,
because there is only one of them.

**Identity is never taken from the request body.** Role, department and student
identity come from the signed JWT. `resolveContextStudent` derives the record a
student or parent request is about from `req.user.sub` alone — a parent cannot
name a different ward, and a student cannot name a different register number.

## Workspace layout

```
apps/api        Express 5 · Prisma · PostgreSQL · JWT · bcrypt · Zod
apps/web        Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4
packages/contracts   Roles, the permission matrix, pagination, Zod schemas
packages/ui          Form controls, dialogs and feedback primitives
packages/config      Shared TypeScript and ESLint configuration
design-handoff       Reference only — never built, never modified
```

`packages/contracts` is compiled to `dist` because both applications import it,
including the Node runtime. `packages/ui` ships TypeScript source and is compiled
into the web app by `transpilePackages` — it is browser-only, so it never needs
a build of its own.

## API structure

```
apps/api/src
├── app.ts                     builds the Express app — no listen()
├── server.ts                  binds the port, handles SIGINT/SIGTERM
├── config/env.ts              every variable, validated by Zod at import time
├── database/prisma.ts         one client per process
├── middleware/                authentication · authorization · validation
│                              · audit · error · not-found · rate-limit
├── shared/
│   ├── constants/             attendance threshold, period times, demo logins
│   ├── context/               the "who is this request about" resolvers
│   ├── errors/                HttpError and its constructors
│   ├── resource/              the generic CRUD framework (see below)
│   ├── storage/               object-storage drivers: local and S3
│   ├── types/                 Express request augmentation
│   └── utils/                 domain rules, CSV, identity, params
└── modules/<feature>/         routes · controller · service · repository
                               · schema · types · permissions · tests
```

Splitting `app.ts` from `server.ts` is what makes the app testable: a test can
call `createApp()` and drive it without a socket.

### The resource framework

Sixteen master-data entities need the same seven endpoints: list with search,
filter, sort and pagination; CSV export; read one; create; update; archive;
restore. Writing that out sixteen times would be sixteen chances to forget the
audit write or the department scope.

`shared/resource/` builds those endpoints from a descriptor. A module declares
its Zod schemas, its Prisma delegate, its searchable and sortable columns, its
permissions, its scope and how to serialise a row — `resourceRouter()` supplies
the rest. `modules/admin/admin.registry.ts` lists every descriptor and mounts
them under `/api/admin`.

Feature modules with real behaviour — attendance, results, fees, leave — are
written out longhand. The framework is for the ones where the shape genuinely is
the same.

## Front-end structure

```
apps/web/src
├── app/                    layout.tsx · page.tsx (composition root only)
├── providers/              Theme · Session · Navigation · Feedback
│                           · Notifications, composed by AppProviders
├── components/
│   ├── layout/             AppShell · Sidebar · Header · GlobalSearch
│   │                       · NotificationBell · MobileNavigation · Portal
│   ├── forms/              ResourceForm — schema-driven data entry
│   ├── tables/             DataTable · ResourceTable
│   ├── feedback/           loading, empty, error and permission states
│   └── ui/                 primitives · blocks · Modal · PageHeader
├── features/<feature>/     screen + components · api · hooks · types
├── config/                 navigation.ts · permissions.ts
├── hooks/                  useResource · useFormOptions · useNow · useViewportWidth
├── lib/api/                client · token · errors · uploads
├── lib/validation/         the browser-side Zod runner
└── lib/utilities/          format · icons
```

### Why navigation is still state, not URLs

The original build kept the current screen in React state and switched on it.
Every screen's local state — an open register, a half-filled form, a search —
lives in memory and survives a screen change, and no navigation triggers a
reload.

Moving to file-based routes would change all of that observable behaviour. The
brief asked for the reorganisation not to alter behaviour, so the switch
statement became a provider plus a registry instead: `NavigationProvider` holds
one route key, guarded by the role's allow-list, and `features/screens.tsx` maps
that key to a component. `app/page.tsx` is four lines.

## Authentication and authorisation

- **Sign-in** — register number, staff ID or email plus a bcrypt-checked
  password, exchanged for a JWT carrying `sub`, `loginId`, `role` and
  `departmentId`. Login is rate-limited per IP *and* per identifier.
- **`requireAuth`** verifies the token and populates `req.user`.
- **`requireRole` / `requirePermission`** gate the route. Permissions resolve
  against `ROLE_PERMISSIONS` in `packages/contracts` — the same table the web app
  reads to decide which buttons to render, so a visible action and a permitted
  action can never disagree.
- **Department scope** — `departmentScopeFor(req)` returns `null` for an
  administrator and the token's department for everyone else. List queries `AND`
  it with the caller's filters, so an HOD cannot widen their reach with a query
  parameter.
- **Ownership** — `assertSubjectAccess` restricts faculty to subjects allocated
  to them; `assertStudentAccess` restricts a student or parent to their own
  record.

## Domain rules worth protecting

These live in `shared/utils/domain.ts` and are covered by tests:

- **Attendance** — an on-duty period counts as attended; approved medical leave
  is removed from the denominator rather than counted as an absence.
- **Internal totals** — a practical scores off the practical mark; a theory
  subject blends the two internal assessments with the assignment.
- **Grades** — banded O / A+ / A / B+ / B / C / RA.
- **CGPA** — the credit-weighted mean of the semester GPAs.
- **Shortage notifications** — saving a register recalculates every affected
  student and raises a notification for anyone below 75%.

## Object storage

Documents and images never live in PostgreSQL. The browser asks
`POST /api/uploads/sign` for a ticket scoped to one purpose, one MIME type and
one size; the API records a `StoredFile` row and returns a short-lived upload
URL. The bytes go straight to the bucket. Only the URL and the metadata are
persisted.

Two drivers implement the same interface: `s3` issues presigned PUTs for
production, `local` writes under `apps/api/.storage` and serves the files back
through `GET /files/*` for development. Nothing above the driver knows which is
in play.

## Audit trail

`AuditLog` records the actor, action, module, entity, before and after values,
IP address and user agent. Creates, updates, archives, restores, approvals,
rejections, payments, marks entry, attendance corrections, sign-ins and password
changes are all written. Where the change runs inside a transaction the audit
write joins it, so the trail cannot disagree with the data.

## Archive, not delete

Financial, attendance, examination and result records are never removed. Every
master-data resource archives instead: the row stays, `status` becomes
`ARCHIVED` and `archivedAt` is stamped. Referential integrity and history both
survive, and a restore is one call. A settled head of fee is frozen outright —
it can be reversed, not edited.
