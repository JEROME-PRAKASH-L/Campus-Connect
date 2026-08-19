import type { RouteKey } from '@campus-connect/contracts';
import { labelFor } from '@/config/navigation';

export const ACADEMIC_YEARS = ['2026 – 27', '2025 – 26', '2024 – 25'] as const;
export const ACADEMIC_YEAR: string = ACADEMIC_YEARS[0];

export const labelForRoute = (route: RouteKey): string => labelFor(route);
