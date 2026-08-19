'use client';

import type { ComponentType } from 'react';
import type { RouteKey } from '@campus-connect/contracts';

import { Academics } from './academics/Academics';
import { Administration } from './administration/Administration';
import { Assignments } from './assignments/Assignments';
import { Attendance } from './attendance/Attendance';
import { Calendar } from './calendar/Calendar';
import { Dashboard } from './dashboard/Dashboard';
import { Examinations } from './examinations/Examinations';
import { Fees } from './fees/Fees';
import { Leave } from './leave/Leave';
import { Materials } from './materials/Materials';
import { Notifications } from './notifications/Notifications';
import { People } from './people/People';
import { Placement } from './placement/Placement';
import { Profile } from './profile/Profile';
import { Reports } from './reports/Reports';
import { Results } from './results/Results';
import { Settings } from './settings/Settings';
import { Timetable } from './timetable/Timetable';

/**
 * One screen per route key. This replaced the seventeen-case switch in
 * `page.tsx`: adding a feature is now a line here plus an entry in
 * `config/navigation.ts`, and the composition root stays four lines long.
 */
export const SCREENS: Record<RouteKey, ComponentType> = {
  dashboard: Dashboard,
  profile: Profile,
  people: People,
  attendance: Attendance,
  timetable: Timetable,
  academics: Academics,
  assignments: Assignments,
  examinations: Examinations,
  results: Results,
  fees: Fees,
  leave: Leave,
  materials: Materials,
  notifications: Notifications,
  calendar: Calendar,
  placement: Placement,
  reports: Reports,
  administration: Administration,
  settings: Settings,
};
