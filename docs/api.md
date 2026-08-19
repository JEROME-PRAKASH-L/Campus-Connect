# API reference

Base URL: `http://localhost:4000` in development.

Every route under `/api` except `POST /api/auth/login` and
`GET /api/auth/demo-accounts` requires `Authorization: Bearer <jwt>`.

Errors come back as `{ "error": "message" }`, plus
`{ "fieldErrors": { "path": "message" } }` when a Zod schema rejected the
payload. Status codes are the usual ones: `400` validation, `401` no or expired
token, `403` role or ownership, `404` missing, `409` conflict, `500` unexpected.

Paginated endpoints return `{ items, meta: { page, pageSize, total, pageCount } }`
and accept `?page`, `?pageSize`, `?search`, `?sort`, `?direction`, `?status` and
per-resource filters.

> Every path in the **Original modules** section below is unchanged from the
> pre-refactor API. Only the internal file layout moved.

---

## Original modules

### Health

| Method | Path | Access |
| --- | --- | --- |
| `GET` | `/health` | Public |

### `auth` — `/api/auth`

| Method | Path | Access | Notes |
| --- | --- | --- | --- |
| `POST` | `/login` | Public | Rate-limited per IP and per identifier |
| `GET` | `/demo-accounts` | Public | The five seeded logins |
| `GET` | `/me` | Any | The signed-in user |
| `POST` | `/change-password` | Any | Minimum ten characters; cannot reuse the current one |

### `dashboard` — `/api/dashboard`

| Method | Path | Access | Notes |
| --- | --- | --- | --- |
| `GET` | `/` | Any | Shape depends on the caller's role: student, parent, faculty, HOD or admin |

### `profile` — `/api/profile`

| Method | Path | Access | Notes |
| --- | --- | --- | --- |
| `GET` | `/` | Any | Student record, or the staff record for staff |
| `PATCH` | `/` | Student | Mobile, blood group, residence, photograph — nothing else |
| `POST` | `/certificates` | Student | Adds a certificate for registry verification |

### `people` — `/api/people`

| Method | Path | Access |
| --- | --- | --- |
| `GET` | `/students` | Faculty, HOD, Admin |
| `GET` | `/faculty` | Faculty, HOD, Admin |
| `GET` | `/summary` | Faculty, HOD, Admin |
| `POST` | `/` | Admin |
| `GET` | `/admissions` | Admin |

### `attendance` — `/api/attendance`

| Method | Path | Access | Notes |
| --- | --- | --- | --- |
| `GET` | `/` | Any | Student, faculty or department view |
| `GET` | `/register` | Faculty, HOD, Admin | Roster with cumulative percentages |
| `POST` | `/register` | Faculty, HOD, Admin | Saves marks, recalculates, raises shortage notices |
| `GET` | `/sessions` | Faculty, HOD, Admin | Recent sessions |
| `POST` | `/correction` | HOD, Admin | Amends one entry with a stored reason |

### `timetable` — `/api/timetable`

| Method | Path | Access |
| --- | --- | --- |
| `GET` | `/` | Any |

### `academics` — `/api/academics`

| Method | Path | Access |
| --- | --- | --- |
| `GET` | `/` | Any |
| `POST` | `/feedback` | Student |
| `POST` | `/allocate` | HOD, Admin |

### `assignments` — `/api/assignments`

| Method | Path | Access |
| --- | --- | --- |
| `GET` | `/` | Any |
| `POST` | `/` | Faculty, HOD, Admin |
| `POST` | `/:id/submit` | Student |
| `POST` | `/:id/grade` | Faculty, HOD, Admin |

### `examinations` — `/api/examinations`

| Method | Path | Access | Notes |
| --- | --- | --- | --- |
| `GET` | `/` | Any | Timetable, hall and seat |
| `GET` | `/:subjectId/marks` | Faculty, HOD, Admin | Semester examination marks |
| `POST` | `/:subjectId/marks` | Faculty, HOD, Admin | |
| `GET` | `/:subjectId/internal-marks` | `marks:read` | IA1, IA2, assignment, practical, with computed total and grade |
| `POST` | `/:subjectId/internal-marks` | `marks:write` | Faculty may only touch subjects allocated to them |

### `results` — `/api/results`

| Method | Path | Access |
| --- | --- | --- |
| `GET` | `/` | Any |

### `fees` — `/api/fees`

| Method | Path | Access | Notes |
| --- | --- | --- | --- |
| `GET` | `/` | Any | Student statement, or the institute rollup for an admin |
| `POST` | `/:id/pay` | Student, Parent | Self-service payment |
| `POST` | `/remind` | Admin | Notifies defaulters in a department |
| `POST` | `/payments` | `fee:write` | Counter payment; issues a receipt in one transaction |

### `leave` — `/api/leave`

| Method | Path | Access |
| --- | --- | --- |
| `GET` | `/` | Any |
| `POST` | `/` | Student |
| `POST` | `/:id/decide` | Faculty, HOD, Admin |
| `DELETE` | `/:id` | Student (own, pending only) |

### `materials` — `/api/materials`

| Method | Path | Access |
| --- | --- | --- |
| `GET` | `/` | Any |
| `POST` | `/` | Faculty, HOD, Admin |
| `POST` | `/:id/download` | Any |

### `notifications` — `/api/notifications`

| Method | Path | Access |
| --- | --- | --- |
| `GET` | `/` | Any |
| `POST` | `/:id/read` | Any |
| `POST` | `/read-all` | Any |
| `POST` | `/announce` | Faculty, HOD, Admin |

### `calendar`, `placement`, `reports`, `search`

Split out of the old `misc.ts` into four modules; the URLs are unchanged.

| Method | Path | Access |
| --- | --- | --- |
| `GET` | `/api/calendar` | Any |
| `GET` | `/api/placement` | Any |
| `POST` | `/api/placement/:id/register` | Student |
| `DELETE` | `/api/placement/:id/register` | Student |
| `GET` | `/api/reports` | Faculty, HOD, Admin |
| `GET` | `/api/search?q=` | Any |

---

## ERP modules

### `admin` — `/api/admin`

| Method | Path | Access | Notes |
| --- | --- | --- | --- |
| `GET` | `/catalogue` | Any | Which resources exist and what they need |
| `GET` | `/options` | Any | Every dropdown's options, department-scoped |

Each resource below exposes the same seven endpoints under
`/api/admin/<resource>`:

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/` | List — search, filter, sort, page, status |
| `GET` | `/export` | CSV of the same query |
| `GET` | `/:id` | One record |
| `POST` | `/` | Create |
| `PATCH` | `/:id` | Update |
| `POST` | `/:id/archive` | Archive |
| `POST` | `/:id/restore` | Restore |

| Resource | Read | Write |
| --- | --- | --- |
| `departments` | `department:read` | `department:write` |
| `programmes` | `programme:read` | `programme:write` |
| `academic-years` | `academic-year:read` | `academic-year:write` |
| `sections` | `section:read` | `section:write` |
| `subjects` | `subject:read` | `subject:write` |
| `students` | `student:read` | `student:write` |
| `faculty` | `faculty:read` | `faculty:write` |
| `parents` | `parent:read` | `parent:write` |
| `users` | `user:read` | `user:write` |
| `timetable` | `timetable:read` | `timetable:write` |
| `fee-categories` | `fee:read` | `fee:write` |
| `fees` | `fee:read` | `fee:write` (no archive — reverse instead) |
| `examinations` | `examination:read` | `examination:write` |
| `events` | `calendar:read` | `calendar:write` |
| `companies` | `placement:read` | `placement:write` |
| `placement-drives` | `placement:read` | `placement:write` |

### `settings` — `/api/settings`

| Method | Path | Access |
| --- | --- | --- |
| `GET` | `/institution` | Any |
| `PUT` | `/institution` | `institution:write` (Admin) |
| `GET` | `/` | `settings:read` (Admin) |

### `support` — `/api/support`

| Method | Path | Access | Notes |
| --- | --- | --- | --- |
| `GET` | `/` | Any | Own requests, or the whole queue for a resolver |
| `POST` | `/` | `support:raise` | Support, contact update, acknowledgement, correction |
| `POST` | `/:id/resolve` | `support:resolve` (HOD, Admin) | |

### `remarks` — `/api/remarks`

| Method | Path | Access | Notes |
| --- | --- | --- | --- |
| `GET` | `/` | Any | Students and parents see only their own record |
| `POST` | `/` | `student:read` (staff) | Ownership checked against the subject and the student |

### `uploads` — `/api/uploads`

| Method | Path | Access | Notes |
| --- | --- | --- | --- |
| `POST` | `/sign` | Any | Validates purpose, MIME type and size, returns a short-lived upload URL |
| `GET` | `/:id` | Any | File metadata |
| `PUT` | `/content?ticket=` | Any | Local development driver only; S3 receives the bytes directly |

Purposes and their limits: `STUDENT_PHOTO` (images, 2 MB), `STUDY_MATERIAL`
(documents and video, 64 MB), `SUBMISSION` (32 MB), `CERTIFICATE` (PDF or image,
8 MB), `INSTITUTION_LOGO` (images, 2 MB).

### `audit` — `/api/audit`

| Method | Path | Access | Notes |
| --- | --- | --- | --- |
| `GET` | `/` | `audit:read` (Admin) | Filter by `module`, `entityType`, `entityId`, `userId` |

### Static files

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/files/*` | Only when `STORAGE_DRIVER=local`; S3 serves its own objects |
