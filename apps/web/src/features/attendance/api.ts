import { api, post } from '@/lib/api';
import type {
  AttendanceMark,
  AttendanceOverview,
  AttendanceRegister,
  AttendanceSession,
} from './types';

export const fetchAttendanceOverview = <T extends AttendanceOverview>() =>
  api<T>('/api/attendance');

export const fetchAttendanceRegister = (subjectId: string, date: string) =>
  api<AttendanceRegister>(
    `/api/attendance/register?subjectId=${subjectId}&date=${date}&period=1`,
  );

export const fetchRecentAttendanceSessions = () =>
  api<{ sessions: AttendanceSession[] }>('/api/attendance/sessions');

export const saveAttendanceRegister = (
  subjectId: string,
  date: string,
  marks: Record<string, AttendanceMark>,
) =>
  post<{ tally: Record<string, number> }>('/api/attendance/register', {
    subjectId,
    date,
    period: 1,
    marks: Object.entries(marks).map(([studentId, mark]) => ({ studentId, mark })),
  });
