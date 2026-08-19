import type { Role } from './roles.js';

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
  /** Set for HODs and faculty; scopes every department-restricted query server-side. */
  departmentId: string | null;
};

export type LoginResponse = { token: string; user: SessionUser };
export type MeResponse = { user: SessionUser };
export type DemoAccount = { role: Role; roleLabel: string; name: string; loginId: string };
export type DemoAccountsResponse = { accounts: DemoAccount[] };

export type Tone = 'OK' | 'WARN' | 'BAD' | 'ACCENT';

export type NotificationItem = {
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

/** Screens the portal can display. Navigation is state-driven, not URL-driven. */
export const ROUTE_KEYS = [
  'dashboard',
  'profile',
  'people',
  'attendance',
  'timetable',
  'academics',
  'assignments',
  'examinations',
  'results',
  'fees',
  'leave',
  'materials',
  'notifications',
  'calendar',
  'placement',
  'reports',
  'administration',
  'settings',
] as const;

export type RouteKey = (typeof ROUTE_KEYS)[number];

export const isRouteKey = (value: string): value is RouteKey => (ROUTE_KEYS as readonly string[]).includes(value);
