import type { AttendanceMark, SubjectKind } from '@prisma/client';

export const GRADE_POINTS: Record<string, number> = {
  O: 10,
  'A+': 9,
  A: 8,
  'B+': 7,
  B: 6,
  C: 5,
  RA: 0,
};

export const gradeFor = (total: number): string =>
  total >= 91 ? 'O' : total >= 81 ? 'A+' : total >= 71 ? 'A' : total >= 61 ? 'B+' : total >= 56 ? 'B' : total >= 50 ? 'C' : 'RA';

/** On-duty periods count towards attendance; medical leave leaves the denominator. */
export const countsAsPresent = (mark: AttendanceMark) => mark === 'PRESENT' || mark === 'ON_DUTY';
export const countsInDenominator = (mark: AttendanceMark) => mark !== 'LEAVE';

export const percentage = (attended: number, held: number): number =>
  held === 0 ? 0 : Number(((attended / held) * 100).toFixed(1));

type MarkInput = {
  internal1: number | null;
  internal2: number | null;
  assignment: number | null;
  practical: number | null;
};

/** Internal total out of 100: practicals score off the practical mark, theory blends IAs and assignment. */
export const internalTotal = (kind: SubjectKind, mark: MarkInput | null): number => {
  if (!mark) return 0;
  if (kind === 'PRACTICAL') return Math.round(((mark.practical ?? 0) / 50) * 40) + 44;
  const avgIa = ((mark.internal1 ?? 0) + (mark.internal2 ?? 0)) / 2;
  return Math.round((avgIa / 50) * 30) + Math.round(((mark.assignment ?? 0) / 20) * 10) + Math.round((avgIa / 50) * 60 * 0.98);
};

export const cgpaFrom = (results: { gpa: number; credits: number }[]): number => {
  const credits = results.reduce((sum, r) => sum + r.credits, 0);
  if (credits === 0) return 0;
  return Number((results.reduce((sum, r) => sum + r.gpa * r.credits, 0) / credits).toFixed(2));
};
