# Roles and permissions

Five roles, one matrix. `packages/contracts/src/permissions.ts` defines it; the
API enforces it through `requirePermission`, and the web app reads the same table
to decide what to render. There is no second copy to fall out of step.

Hiding a control is presentation, not protection. Every endpoint re-checks.

## What each role may do

### Administrator

Everything. Institution profile, departments, degree programmes, academic years
and semesters, sections, subjects, students, faculty, HOD assignments, parent
accounts, user roles, the timetable, fee categories and assignments, payment
records, examinations, events and holidays, notifications, placement companies
and drives, system settings, and the audit trail.

### Head of department — scoped to their own department

Department subjects, faculty–subject allocation, class advisers, section
allocation, the department timetable, faculty workload, attendance corrections,
internal-mark approval, leave approval, department announcements and academic
reports. They may also resolve support requests.

They may not create accounts, change institution settings, raise fees or read the
audit trail.

The scope is not advisory: `departmentScopeFor(req)` returns the department from
their JWT, and every list query `AND`s it with the caller's filters. A
`?departmentId=` pointing elsewhere changes nothing.

### Faculty — scoped to their allocated subjects

Daily attendance, internal assessment marks, assignment details and marks,
practical marks, study materials, class announcements, student remarks and their
own leave requests.

`assertSubjectAccess` checks the allocation on every read and every write. A
faculty member cannot open, let alone save, a mark sheet for a subject that is
not theirs.

### Student — scoped to their own record

Editable profile information (mobile, blood group, residence, photograph),
assignment submissions, leave applications, placement registrations, certificate
information, support requests and password changes.

`studentSelfUpdateSchema` is `.strict()` and lists exactly four fields. A request
carrying `registerNumber`, `sectionId` or `departmentId` is rejected outright,
not partially applied.

### Parent — read-only, scoped to their linked ward

Ward profile, attendance, marks and results, fees and receipts, timetable,
examinations and notifications.

They may enter only contact-information update requests, acknowledgements and
support requests.

The ward is resolved from the parent's own `Parent.wardId` via the token. There
is no student identifier in any parent request to tamper with.

## Permission reference

Format: `<resource>:<action>`.

| Permission | Student | Parent | Faculty | HOD | Admin |
| --- | :-: | :-: | :-: | :-: | :-: |
| `institution:read` | | | ● | ● | ● |
| `institution:write` | | | | | ● |
| `department:read` | | | ● | ● | ● |
| `department:write` | | | | ● | ● |
| `programme:read` | | | ● | ● | ● |
| `programme:write` | | | | | ● |
| `academic-year:read` | | | ● | ● | ● |
| `academic-year:write` | | | | | ● |
| `section:read` | | | ● | ● | ● |
| `section:write` | | | | ● | ● |
| `subject:read` | | | ● | ● | ● |
| `subject:write` | | | | ● | ● |
| `student:read` | | | ● | ● | ● |
| `student:write` | | | | ● | ● |
| `student:read-own` | ● | ● | | | ● |
| `student:write-own` | ● | | | | ● |
| `faculty:read` | | | ● | ● | ● |
| `faculty:write` | | | | ● | ● |
| `parent:read` | | | | ● | ● |
| `parent:write` | | | | | ● |
| `user:read` / `user:write` | | | | | ● |
| `timetable:read` | ● | ● | ● | ● | ● |
| `timetable:write` | | | | ● | ● |
| `attendance:read` | ● | ● | ● | ● | ● |
| `attendance:write` | | | ● | ● | ● |
| `attendance:correct` | | | | ● | ● |
| `marks:read` | ● | ● | ● | ● | ● |
| `marks:write` | | | ● | ● | ● |
| `marks:approve` | | | | ● | ● |
| `assignment:read` | ● | | ● | ● | ● |
| `assignment:write` | | | ● | ● | ● |
| `assignment:submit` | ● | | | | ● |
| `examination:read` | ● | ● | ● | ● | ● |
| `examination:write` | | | | ● | ● |
| `result:read` | ● | ● | ● | ● | ● |
| `result:publish` | | | | | ● |
| `fee:read` | ● | ● | | ● | ● |
| `fee:write` | | | | | ● |
| `fee:pay` | ● | ● | | | ● |
| `leave:read` | ● | | ● | ● | ● |
| `leave:apply` | ● | | ● | ● | ● |
| `leave:decide` | | | ● | ● | ● |
| `material:read` | ● | | ● | ● | ● |
| `material:write` | | | ● | ● | ● |
| `notification:read` | ● | ● | ● | ● | ● |
| `notification:announce` | | | ● | ● | ● |
| `calendar:read` | ● | ● | ● | ● | ● |
| `calendar:write` | | | | | ● |
| `placement:read` | ● | | ● | ● | ● |
| `placement:write` | | | | | ● |
| `placement:register` | ● | | | | ● |
| `report:read` | | | ● | ● | ● |
| `support:raise` | ● | ● | ● | ● | ● |
| `support:resolve` | | | | ● | ● |
| `audit:read` | | | | | ● |
| `settings:read` / `settings:write` | | | | | ● |

`apps/api/src/modules/auth/auth.permissions.test.ts` asserts these boundaries,
including that no role ever holds a `:write` without the matching `:read`.

## Navigation by role

The sidebar mirrors the matrix — `apps/web/src/config/navigation.ts`, pinned by
`config/navigation.test.ts`.

| Role | Screens |
| --- | --- |
| Student | Dashboard, Profile, Attendance, Timetable, Academics, Assignments, Examinations, Results, Fees, Leave, Materials, Notifications, Calendar, Placement, Settings |
| Faculty | …plus People and Reports; Attendance becomes the four-state register |
| HOD | Dashboard, People, Attendance, Timetable, Academics, Examinations, Results, Leave, Reports, Administration, Notifications, Calendar, Placement, Settings |
| Admin | Dashboard, People, Academics, Attendance, Timetable, Examinations, Results, Fees, Reports, Administration, Notifications, Calendar, Placement, Settings |
| Parent | Dashboard, Profile, Attendance, Timetable, Results, Examinations, Fees, Notifications, Calendar, Settings |

Administration is the one screen added by this build, and only the two roles that
manage master data can reach it.

## Where each guard lives

| Guard | File | What it protects |
| --- | --- | --- |
| `requireAuth` | `middleware/authentication.middleware.ts` | Is there a valid token |
| `requireRole` | `middleware/authorization.middleware.ts` | Coarse role gate |
| `requirePermission` | `middleware/authorization.middleware.ts` | The matrix above |
| `departmentScopeFor` | `middleware/authorization.middleware.ts` | HOD department boundary |
| `assertSubjectAccess` | `shared/context/request-context.ts` | Faculty subject allocation |
| `assertStudentAccess` | `shared/context/request-context.ts` | Staff reach over one student |
| `resolveContextStudent` | `shared/context/request-context.ts` | Student and parent ownership |
| `validate(schema)` | `middleware/validation.middleware.ts` | Mass assignment, via `.strict()` |
