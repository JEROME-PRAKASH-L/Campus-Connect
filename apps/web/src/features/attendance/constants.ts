import type { AttendanceMark } from './types';

export const ATTENDANCE_MARK_OPTIONS: {
  key: AttendanceMark;
  short: string;
  label: string;
  tone: string;
}[] = [
  { key: 'PRESENT', short: 'P', label: 'Present', tone: 'var(--status-ok)' },
  { key: 'ABSENT', short: 'A', label: 'Absent', tone: 'var(--status-bad)' },
  { key: 'ON_DUTY', short: 'OD', label: 'On duty', tone: 'var(--color-accent)' },
  { key: 'LEAVE', short: 'L', label: 'Leave', tone: 'var(--status-warn)' },
];
