# Contributing

## Before you start

Read [`docs/development.md`](docs/development.md) for local setup and
[`docs/architecture.md`](docs/architecture.md) for how the pieces fit together.

Two rules that are not negotiable:

1. **`design-handoff/` is reference-only.** It is the original Claude Design
   export and the source of truth for the Classic look. It is never built, never
   linted, never deployed and never edited.
2. **No application data in code.** Nothing the portal displays may be
   hard-coded. Demo data belongs in `apps/api/prisma/seed.ts` and nowhere else;
   real data is entered through a form and read back from PostgreSQL.

## Branches

Branch off the default branch, `campus-connect-implementation`.

| Prefix | For |
| --- | --- |
| `feature/` | New capability |
| `fix/` | A bug |
| `refactor/` | Restructuring with no behaviour change |
| `docs/` | Documentation only |
| `chore/` | Tooling, dependencies, CI |

Use short, lowercase, hyphenated names: `feature/hostel-allocation`,
`fix/attendance-denominator`.

## Commits

Conventional Commits — `<type>(<scope>): <subject>`.

```
feat(attendance): allow an HOD to correct a saved register
fix(fees): stop a settled head of fee being edited
refactor(api): split misc.ts into calendar, placement, reports and search
docs(api): document the internal-marks endpoints
test(auth): pin the HOD permission boundary
chore(ci): run the suite on Node 22
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `build`.

Write the subject in the imperative, under about 72 characters, with no trailing
full stop. If the *why* is not obvious from the diff, put it in the body.

Use `git mv` when moving a file so its history follows it.

## Pull requests

Open as a draft while you are still working, and mark ready when CI is green.

A pull request should say what changed, why, and how you verified it. Call out
anything that touches a URL, a permission, the Prisma schema or the visual
design.

Before you request review:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

CI runs the same four on Node 22, plus Prisma client generation. It needs no
production secrets — a placeholder `DATABASE_URL` is enough, because nothing in
the workflow connects to a database.

## Code conventions

**TypeScript.** Strict mode everywhere, from `tsconfig.base.json`. No `any` in
the web app; the one deliberate exception in the API is the resource
framework's Prisma delegate, and it is documented where it appears.

**Backend.** One folder per module under `apps/api/src/modules/`. Split by
responsibility as the module earns it — routes, controller, service, repository,
schema, types, permissions — and do not add layers a three-line module does not
need. Keep endpoint URLs stable; a move is not a rename.

**Frontend.** One folder per feature under `apps/web/src/features/`. Screens
compose; they do not fetch and format and validate all in one file. Shared
layout lives in `components/layout/`, generic controls in `components/ui/`,
`components/forms/` and `components/tables/`.

**Contracts.** Any payload crossing the wire gets a Zod schema in
`packages/contracts`, used by both ends. Make object schemas `.strict()` — that
is what stops a form over-posting a field it should not be able to set.

**Permissions.** Add the permission to the matrix in
`packages/contracts/src/permissions.ts` first, then gate the route with
`requirePermission`. Never invent a rule in the web app: it reads the same table.

**Security.** Derive role, department and record ownership from the JWT, never
from the request body. Validate on both ends. Archive rather than delete
financial, attendance, examination and result records. Write an audit entry for
anything that changes data.

**Design.** The Classic look — navy rail, accent-ruled panels, Manrope — is
fixed. Build on the existing CSS custom properties and classes rather than
introducing new colours or spacing. If a screen needs a control that does not
exist, add it to `packages/ui` so it looks the same everywhere.

## Tests

Both suites use the Node test runner through `tsx`; no extra framework.

- `apps/api/src/**/*.test.ts` — domain rules, permissions, the resource query
  builder, utilities.
- `apps/web/src/**/*.test.ts` — pure helpers: formatting, navigation policy,
  browser-side validation.

Cover the rule, not the plumbing. Attendance counting, grade bands, CGPA
weighting and every permission boundary all have tests — keep them passing, and
add to them when you change a rule.

## Reporting a security issue

Do not open a public issue. Contact the maintainers directly.
