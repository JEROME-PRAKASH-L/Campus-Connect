import { ICONS } from './icons';
import type { Role, RouteKey } from './types';

const ALL: Record<RouteKey, { label: string; icon: string }> = {
  dashboard: { label: 'Dashboard', icon: ICONS.dash },
  profile: { label: 'Profile', icon: ICONS.user },
  people: { label: 'People', icon: ICONS.users },
  attendance: { label: 'Attendance', icon: ICONS.att },
  timetable: { label: 'Timetable', icon: ICONS.clock },
  academics: { label: 'Academics', icon: ICONS.book },
  assignments: { label: 'Assignments', icon: ICONS.file },
  examinations: { label: 'Examinations', icon: ICONS.cap },
  results: { label: 'Results', icon: ICONS.award },
  fees: { label: 'Fees', icon: ICONS.card },
  leave: { label: 'Leave', icon: ICONS.out },
  materials: { label: 'Materials', icon: ICONS.folder },
  notifications: { label: 'Notifications', icon: ICONS.bell },
  calendar: { label: 'Calendar', icon: ICONS.cal },
  placement: { label: 'Placement', icon: ICONS.case },
  reports: { label: 'Reports', icon: ICONS.chart },
  settings: { label: 'Settings', icon: ICONS.gear },
};

const SETS: Record<Role, RouteKey[]> = {
  STUDENT: ['dashboard', 'profile', 'attendance', 'timetable', 'academics', 'assignments', 'examinations', 'results', 'fees', 'leave', 'materials', 'notifications', 'calendar', 'placement', 'settings'],
  FACULTY: ['dashboard', 'profile', 'attendance', 'timetable', 'academics', 'assignments', 'examinations', 'results', 'leave', 'materials', 'people', 'notifications', 'calendar', 'reports', 'settings'],
  HOD: ['dashboard', 'people', 'attendance', 'timetable', 'academics', 'examinations', 'results', 'leave', 'reports', 'notifications', 'calendar', 'placement', 'settings'],
  ADMIN: ['dashboard', 'people', 'academics', 'attendance', 'timetable', 'examinations', 'results', 'fees', 'reports', 'notifications', 'calendar', 'placement', 'settings'],
  PARENT: ['dashboard', 'profile', 'attendance', 'timetable', 'results', 'examinations', 'fees', 'notifications', 'calendar', 'settings'],
};

export const navFor = (role: Role) =>
  SETS[role].map((key) => ({ key, label: ALL[key].label, icon: ALL[key].icon }));

export const isRouteAllowed = (role: Role, route: RouteKey) => SETS[role].includes(route);
