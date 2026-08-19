/** Minimum attendance the institute requires in every subject. */
export const ATTENDANCE_THRESHOLD = 75;

/** Period start/end times, in order. Shared by the timetable and the dashboard. */
export const PERIODS: readonly (readonly [string, string])[] = [
  ['09:00', '09:50'],
  ['09:50', '10:40'],
  ['11:00', '11:50'],
  ['11:50', '12:40'],
  ['13:30', '14:20'],
  ['14:20', '15:10'],
  ['15:10', '16:00'],
];

export const DEMO_LOGIN_IDS = ['21CSE042', 'FAC1180', 'HOD204', 'ADM001', 'PAR7042'] as const;

export const DEFAULT_PASSWORD = 'demo1234';
