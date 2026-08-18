import assert from 'node:assert/strict';
import test from 'node:test';
import {
  attendanceRegisterQuerySchema,
  saveAttendanceRegisterSchema,
} from './attendance.schemas.js';

test('attendance register query keeps the existing defaults and coercion', () => {
  assert.deepEqual(
    attendanceRegisterQuerySchema.parse({ subjectId: 'subject-1', date: '2026-08-18' }),
    { subjectId: 'subject-1', date: '2026-08-18', period: 1 },
  );
  assert.equal(
    attendanceRegisterQuerySchema.parse({
      subjectId: 'subject-1',
      date: '2026-08-18',
      period: '3',
    }).period,
    3,
  );
});

test('attendance register query rejects missing required fields', () => {
  assert.equal(attendanceRegisterQuerySchema.safeParse({ date: '2026-08-18' }).success, false);
  assert.equal(attendanceRegisterQuerySchema.safeParse({ subjectId: 'subject-1' }).success, false);
});

test('attendance save payload accepts the four supported marks', () => {
  const parsed = saveAttendanceRegisterSchema.parse({
    subjectId: 'subject-1',
    date: '2026-08-18',
    period: 2,
    marks: [
      { studentId: 'student-1', mark: 'PRESENT' },
      { studentId: 'student-2', mark: 'ABSENT' },
      { studentId: 'student-3', mark: 'ON_DUTY' },
      { studentId: 'student-4', mark: 'LEAVE' },
    ],
  });

  assert.equal(parsed.marks.length, 4);
});

test('attendance save payload rejects invalid marks, empty registers, and periods outside 1-7', () => {
  const base = { subjectId: 'subject-1', date: '2026-08-18', period: 1 };

  assert.equal(saveAttendanceRegisterSchema.safeParse({ ...base, marks: [] }).success, false);
  assert.equal(
    saveAttendanceRegisterSchema.safeParse({
      ...base,
      marks: [{ studentId: 'student-1', mark: 'REMOTE' }],
    }).success,
    false,
  );
  assert.equal(
    saveAttendanceRegisterSchema.safeParse({
      ...base,
      period: 8,
      marks: [{ studentId: 'student-1', mark: 'PRESENT' }],
    }).success,
    false,
  );
});
