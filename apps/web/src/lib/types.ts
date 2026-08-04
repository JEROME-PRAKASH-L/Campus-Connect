export type Role = 'STUDENT' | 'FACULTY' | 'HOD' | 'ADMIN' | 'PARENT';

export type SessionUser = {
  id: string;
  loginId: string;
  name: string;
  email: string;
  role: Role;
  initials: string;
  roleLabel: string;
  extra: string;
  department: string;
  departmentName: string;
};

export type RouteKey =
  | 'dashboard'
  | 'profile'
  | 'people'
  | 'attendance'
  | 'timetable'
  | 'academics'
  | 'assignments'
  | 'examinations'
  | 'results'
  | 'fees'
  | 'leave'
  | 'materials'
  | 'notifications'
  | 'calendar'
  | 'placement'
  | 'reports'
  | 'settings';

export type Tone = 'OK' | 'WARN' | 'BAD' | 'ACCENT';

export type Notification = {
  id: string;
  kind: string;
  title: string;
  body: string;
  tone: Tone;
  route: string;
  read: boolean;
  createdAt: string;
};

export type SearchResult = { kind: string; label: string; sub: string; route: string };
