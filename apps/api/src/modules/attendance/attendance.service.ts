import { prisma } from '../../database/prisma.js';
import { countsAsPresent, countsInDenominator, percentage } from '../../shared/utils/domain.js';

/**
 * Per-subject attendance for one student in one semester.
 *
 * The counting rules are the institute's, not Prisma's: an on-duty period counts
 * as attended, and approved medical leave is removed from the denominator
 * entirely rather than counted as an absence.
 */
export const subjectAttendanceFor = async (studentId: string, semesterId: string) => {
  const subjects = await prisma.subject.findMany({
    where: { semesterId },
    include: { faculty: { include: { user: true } } },
    orderBy: { code: 'asc' },
  });
  const records = await prisma.attendanceRecord.findMany({ where: { studentId } });
  return subjects.map((subject) => {
    const own = records.filter((r) => r.subjectId === subject.id);
    const held = own.filter((r) => countsInDenominator(r.mark)).length;
    const attended = own.filter((r) => countsAsPresent(r.mark)).length;
    return {
      id: subject.id,
      code: subject.code,
      name: subject.name,
      shortName: subject.shortName,
      kind: subject.kind,
      credits: subject.credits,
      room: subject.room,
      faculty: subject.faculty?.user.name ?? 'Unallocated',
      held,
      attended,
      percentage: percentage(attended, held),
    };
  });
};

/** Cumulative percentage for one student in one subject, used after a register is saved. */
export const cumulativeFor = async (studentId: string, subjectId: string) => {
  const own = await prisma.attendanceRecord.findMany({ where: { studentId, subjectId } });
  const held = own.filter((r) => countsInDenominator(r.mark)).length;
  const attended = own.filter((r) => countsAsPresent(r.mark)).length;
  return percentage(attended, held);
};
