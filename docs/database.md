# Database

PostgreSQL 16, accessed exclusively through Prisma. The schema lives in
`apps/api/prisma/schema.prisma`.

## Principles

**No application data in code.** Nothing the portal displays is hard-coded.
Every figure — attendance percentages, CGPA, fee balances, pass rates — is
derived at request time from stored rows. The only demo data in the repository
is `prisma/seed.ts`, and it exists so a fresh clone has something to look at.

**Files are not stored in the database.** Documents and images live in object
storage. `StoredFile` holds the URL, key, name, MIME type, size and purpose, and
the owning record holds a nullable foreign key to it.

**Records are archived, not deleted.** Master-data tables carry `status`
(`ACTIVE` / `ARCHIVED`) and `archivedAt`. Archiving hides a row from the default
list while keeping it and everything that references it intact.

## Lifecycle columns

Every master-data model carries the same six columns:

| Column | Type | Purpose |
| --- | --- | --- |
| `status` | `RecordStatus` | `ACTIVE` by default; `ARCHIVED` hides the row |
| `archivedAt` | `DateTime?` | When it was archived |
| `createdById` | `String?` | The account that created it |
| `updatedById` | `String?` | The account that last changed it |
| `createdAt` | `DateTime` | Defaults to now |
| `updatedAt` | `DateTime` | Defaults to now, maintained by Prisma |

They are scalar stamps rather than relations. Eighteen models each holding two
named relations back to `User` would add thirty-six back-references to `User`
for no query anyone runs — the audit trail is where "who did what" is actually
read from.

Models carrying them: `User`, `Department`, `Course`, `Semester`, `Section`,
`Student`, `Faculty`, `Parent`, `Subject`, `TimetableEntry`, `Assignment`,
`Mark`, `Exam`, `Fee`, `Payment`, `StudyMaterial`, `Event`, `Certificate`,
`PlacementDrive`, `LeaveRequest`, `StudentRemark`, `FeeCategory`, `Company`.

## Models added for the ERP build

Every addition is additive with a default, so existing rows survive the
migration untouched.

### `AuditLog`

The record of who changed what.

| Column | Notes |
| --- | --- |
| `id`, `createdAt` | |
| `userId` | Nullable; `SetNull` so archiving an account keeps the history |
| `action` | `CREATE` `UPDATE` `ARCHIVE` `RESTORE` `DELETE` `APPROVE` `REJECT` `PAYMENT` `MARKS` `ATTENDANCE` `LOGIN` `PASSWORD` |
| `module`, `entityType`, `entityId` | What was touched |
| `oldValues`, `newValues` | JSON snapshots either side of the change |
| `ipAddress`, `userAgent` | Taken from the request, never from the body |

Indexed on `(module, entityType, entityId)` and `(userId, createdAt)`.

### `Setting`

Key/JSON-value rows for the institution profile and system settings. Structure
can grow without a migration.

### `StoredFile`

Object-storage metadata: `key`, `url`, `fileName`, `mimeType`, `sizeBytes`,
`purpose`, `checksum`, `uploadedById`. Referenced by `Student.photoFileId`,
`StudyMaterial.fileId`, `Submission.fileId` and `Certificate.fileId`.

### `SupportRequest`

Support tickets, contact-update requests, acknowledgements and record
corrections. Carries `kind`, `subject`, `body`, `status`, `resolution`,
`raisedById`, `resolvedById` and `resolvedAt`.

### `StudentRemark`

A faculty note against a student, optionally tied to a subject. Carries a
category — academic, behaviour, attendance or commendation.

### `FeeCategory`

Heads of fee defined once and assigned to students. `Fee.categoryId` links to it.

### `Company`

Recruiters, entered once. `PlacementDrive.companyId` links to it; the existing
`PlacementDrive.company` string is kept so no seeded drive breaks.

## Relations added to existing models

| Model | Column | Purpose |
| --- | --- | --- |
| `Department` | `hodUserId` | The account heading the department |
| `Section` | `advisorFacultyId` | The class adviser |
| `Student` | `photoFileId` | Portrait in object storage |
| `Fee` | `categoryId` | Head of fee |
| `PlacementDrive` | `companyId` | The recruiter record |
| `StudyMaterial` | `fileId` | The uploaded document |
| `Submission` | `fileId` | The submitted work |
| `Certificate` | `fileId` | The scanned copy |
| `AttendanceRecord` | `correctionReason`, `updatedAt` | Why an entry was amended |

All nullable. Nothing existing was renamed, retyped or removed.

## Enums

Pre-existing: `Role`, `SubjectKind`, `AttendanceMark`, `AssignmentStatus`,
`LeaveType`, `LeaveStatus`, `FeeStatus`, `NotificationKind`, `Tone`,
`MaterialKind`.

Added: `RecordStatus`, `AuditAction`, `UploadPurpose`, `SupportRequestKind`,
`SupportRequestStatus`, `RemarkCategory`.

## Computed, never stored

These are calculated per request in `apps/api/src/shared/utils/domain.ts`:

- **Attendance percentage** — from `AttendanceRecord`. On-duty counts as
  attended; approved medical leave leaves the denominator.
- **Internal total and grade** — a practical scores off the practical mark, a
  theory subject blends both internal assessments with the assignment, then the
  total is banded O / A+ / A / B+ / B / C / RA.
- **CGPA** — the credit-weighted mean of the published semester GPAs.
- **Fee balance, submission counts, pass percentages, institute averages** —
  aggregated at request time.

## Migrations

The project uses `prisma db push` for development. For a deployment with data,
generate a migration instead:

```bash
npx prisma migrate dev --name <change>     # authoring
npx prisma migrate deploy                  # applying
```

Every column added by this build has a default or is nullable, so applying it to
a populated database is a non-destructive `ALTER TABLE`.
