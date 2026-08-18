'use client';

import { AttendanceDonut } from '@/components/blocks';
import { DataTable, TwoLine } from '@/components/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { Bar, KpiCards, Tag } from '@/components/primitives';
import { useShell } from '@/components/AppShell';
import { attendanceTone } from '@/lib/format';
import { ICONS } from '@/lib/icons';
import type { StudentAttendanceView as StudentAttendanceData } from '../types';

export const StudentAttendanceView = ({ data }: { data: StudentAttendanceData }) => {
  const { toast } = useShell();
  const atRisk = data.subjects.filter(
    (subject) => subject.held > 0 && subject.percentage < 75,
  );
  const best = [...data.subjects]
    .filter((subject) => subject.held > 0)
    .sort((first, second) => second.percentage - first.percentage)[0];

  return (
    <>
      <PageHeader
        kicker={data.student.section ? `Section ${data.student.section}` : 'Attendance'}
        title="My attendance"
        sub="Subject-wise attendance for the current semester. 75% is required to sit the semester examination."
        actions={[
          {
            label: 'Download statement',
            icon: ICONS.down,
            onClick: () => toast('Attendance statement downloaded.'),
          },
        ]}
      />
      <KpiCards
        kpis={[
          {
            label: 'Overall',
            value: `${data.overall.percentage}%`,
            sub: `${data.overall.attended} of ${data.overall.held} periods`,
            icon: ICONS.att,
            tone: attendanceTone(data.overall.percentage),
            bar: `${data.overall.percentage}%`,
          },
          {
            label: 'Best subject',
            value: best ? `${best.percentage}%` : '—',
            sub: best?.name ?? '',
            icon: ICONS.cap,
            tone: 'var(--status-ok)',
            bar: `${best?.percentage ?? 0}%`,
          },
          {
            label: 'At risk',
            value: String(atRisk.length),
            sub: atRisk.length
              ? `${atRisk[0].code} · ${atRisk[0].percentage}%`
              : 'None below 75%',
            icon: ICONS.chart,
            tone: atRisk.length ? 'var(--status-bad)' : 'var(--status-ok)',
            bar: '15%',
          },
          {
            label: 'Periods missed',
            value: String(data.overall.held - data.overall.attended),
            sub: 'This semester',
            icon: ICONS.clock,
            tone: 'var(--status-warn)',
            bar: '35%',
          },
        ]}
      />
      <AttendanceDonut
        title="Attendance overview"
        meta={`${data.overall.attended} / ${data.overall.held} periods`}
        percentage={data.overall.percentage}
        caption="OVERALL"
        bars={data.subjects
          .slice(0, 5)
          .map((subject) => ({ label: subject.shortName, value: subject.percentage }))}
        note={
          atRisk.length
            ? `${atRisk[0].code} is short by ${(75 - atRisk[0].percentage).toFixed(1)} points.`
            : 'Every subject is above the 75% requirement.'
        }
      />
      <DataTable
        title="Subject-wise attendance"
        sub="Current semester"
        columns={[
          { label: 'Subject' },
          { label: 'Type' },
          { label: 'Held', align: 'right' },
          { label: 'Attended', align: 'right' },
          { label: 'Percentage', width: '200px' },
          { label: 'Status' },
        ]}
        rows={data.subjects.map((subject) => ({
          key: subject.id,
          cells: [
            <TwoLine
              key="name"
              top={subject.name}
              bottom={`${subject.code} · ${subject.faculty}`}
            />,
            subject.kind === 'PRACTICAL' ? 'Practical' : 'Theory',
            String(subject.held),
            String(subject.attended),
            <Bar
              key="attendance"
              value={subject.percentage}
              tone={attendanceTone(subject.percentage)}
            />,
            <Tag
              key="status"
              kind={subject.percentage >= 75 ? 'tag-accent' : 'tag-neutral'}
            >
              {subject.percentage >= 85
                ? 'Good'
                : subject.percentage >= 75
                  ? 'Watch'
                  : 'Shortage'}
            </Tag>,
          ],
        }))}
        note="On-duty periods count towards attendance. Medical leave is excluded from the denominator."
      />
    </>
  );
};
