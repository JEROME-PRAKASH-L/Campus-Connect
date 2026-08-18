'use client';

import { AttendanceDonut } from '@/components/blocks';
import { DataTable, TwoLine } from '@/components/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { Bar, KpiCards, Tag } from '@/components/primitives';
import { useShell } from '@/components/AppShell';
import { attendanceTone } from '@/lib/format';
import { ICONS } from '@/lib/icons';
import type { DepartmentAttendanceView as DepartmentAttendanceData } from '../types';

export const DepartmentAttendanceView = ({ data }: { data: DepartmentAttendanceData }) => {
  const { toast } = useShell();
  const lowest = [...data.departments].sort(
    (first, second) => first.avgAttendance - second.avgAttendance,
  )[0];
  const best = [...data.departments].sort(
    (first, second) => second.avgAttendance - first.avgAttendance,
  )[0];

  return (
    <>
      <PageHeader
        kicker="Attendance monitoring"
        title="Attendance monitoring"
        sub="Live percentages by department. Anything under 85% is flagged for departmental review."
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
            label: 'Institute',
            value: `${data.institute}%`,
            sub: 'Rolling 30 days',
            icon: ICONS.att,
            tone: attendanceTone(data.institute),
            bar: `${data.institute}%`,
          },
          {
            label: 'Best',
            value: `${best.code} ${best.avgAttendance}%`,
            sub: best.name,
            icon: ICONS.chart,
            tone: 'var(--status-ok)',
            bar: `${best.avgAttendance}%`,
          },
          {
            label: 'Lowest',
            value: `${lowest.code} ${lowest.avgAttendance}%`,
            sub: 'Below the 85% target',
            icon: ICONS.chart,
            tone: 'var(--status-bad)',
            bar: `${lowest.avgAttendance}%`,
          },
          {
            label: 'Departments',
            value: String(data.departments.length),
            sub: 'Under monitoring',
            icon: ICONS.users,
            tone: 'var(--color-accent)',
            bar: '100%',
          },
        ]}
      />
      <AttendanceDonut
        title="Attendance by department"
        meta="This month"
        percentage={data.institute}
        caption="INSTITUTE AVG"
        bars={data.departments
          .slice(0, 5)
          .map((department) => ({ label: department.code, value: department.avgAttendance }))}
        note={`${lowest.name} is ${(data.institute - lowest.avgAttendance).toFixed(1)} points below the institute average — flagged for review.`}
      />
      <DataTable
        title="Department register"
        sub="Semester to date"
        columns={[
          { label: 'Department' },
          { label: 'Students', align: 'right' },
          { label: 'Faculty', align: 'right' },
          { label: 'Attendance', width: '200px' },
          { label: 'Status' },
        ]}
        rows={data.departments.map((department) => ({
          key: department.code,
          cells: [
            <TwoLine
              key="name"
              top={department.name}
              bottom={`${department.code} · ${department.hodName}`}
            />,
            String(department.studentCount),
            String(department.facultyCount),
            <Bar
              key="attendance"
              value={department.avgAttendance}
              tone={attendanceTone(department.avgAttendance)}
            />,
            <Tag
              key="status"
              kind={department.avgAttendance >= 85 ? 'tag-accent' : 'tag-neutral'}
            >
              {department.avgAttendance >= 85 ? 'On track' : 'Review'}
            </Tag>,
          ],
        }))}
        note="Figures refresh every time a faculty member saves a register."
      />
    </>
  );
};
