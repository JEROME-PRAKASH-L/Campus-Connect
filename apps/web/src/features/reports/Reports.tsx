'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ICONS } from '@/lib/utilities/icons';
import { attendanceTone } from '@/lib/utilities/format';
import { useShell } from '@/components/layout/AppShell';
import { PageHeader, PageState } from '@/components/ui/PageHeader';
import { KpiCards, Tag } from '@/components/ui/primitives';
import { AttendanceDonut, BarChart, CardGrid, Grid } from '@/components/ui/blocks';

type ReportsData = {
  departments: { code: string; name: string; avgAttendance: number; passPercentage: number; studentCount: number }[];
  institute: { attendance: number; passPercentage: number; studentsTracked: number };
  reports: { title: string; description: string; cadence: string }[];
};

export const Reports = () => {
  const { toast } = useShell();
  const [data, setData] = useState<ReportsData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<ReportsData>('/api/reports')
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load reports.'));
  }, []);

  if (error) return <PageState>{error}</PageState>;
  if (!data) return <PageState>Loading reports…</PageState>;

  const belowTarget = data.departments.filter((d) => d.avgAttendance < 85).length;

  return (
    <>
      <PageHeader
        kicker="Analytics"
        title="Reports"
        sub="Standing reports for the department and institute, generated on demand."
        actions={[{ label: 'Schedule report', icon: ICONS.clock, onClick: () => toast('Weekly schedule saved.') }]}
      />
      <KpiCards
        kpis={[
          { label: 'Avg. attendance', value: `${data.institute.attendance}%`, sub: 'Institute-wide', icon: ICONS.att, tone: attendanceTone(data.institute.attendance), bar: `${data.institute.attendance}%` },
          { label: 'Pass percentage', value: `${data.institute.passPercentage}%`, sub: 'Latest cycle', icon: ICONS.cap, tone: 'var(--status-ok)', bar: `${data.institute.passPercentage}%` },
          { label: 'Below target', value: String(belowTarget), sub: 'Departments under 85%', icon: ICONS.chart, tone: belowTarget ? 'var(--status-bad)' : 'var(--status-ok)', bar: '12%' },
          { label: 'Reports available', value: String(data.reports.length), sub: 'Standing definitions', icon: ICONS.file, tone: 'var(--color-accent)', bar: '60%' },
        ]}
      />
      <Grid>
        <AttendanceDonut
          title="Attendance by department"
          meta="This month"
          percentage={data.institute.attendance}
          caption="INSTITUTE AVG"
          bars={data.departments.slice(0, 5).map((d) => ({ label: d.code, value: d.avgAttendance }))}
          note={`${belowTarget} department${belowTarget === 1 ? '' : 's'} below the 85% target.`}
        />
        <BarChart
          title="Pass percentage by department"
          meta="Latest published results"
          bars={data.departments.map((d) => ({ label: d.code, value: d.passPercentage.toFixed(1), height: d.passPercentage }))}
          note={`Institute pass percentage ${data.institute.passPercentage}%.`}
        />
      </Grid>
      <CardGrid>
        {data.reports.map((r) => (
          <div key={r.title} className="card anim-fade-up" style={{ padding: 20, paddingTop: 22, gap: 'var(--space-2)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
              <span className="card-kicker">{r.cadence}</span>
              <Tag kind="tag-accent">Report</Tag>
            </div>
            <div className="card-title">{r.title}</div>
            <p className="card-body">{r.description}</p>
            <div className="card-meta" style={{ justifyContent: 'space-between', borderTop: '1px solid var(--color-divider)', paddingTop: 9, marginTop: 3, gap: 8, flexWrap: 'wrap' }}>
              <span>Generated on demand</span>
              <button type="button" className="btn btn-primary" style={{ fontSize: 11.5, padding: '4px 10px' }} onClick={() => toast(`“${r.title}” generated — download link emailed.`)}>
                Generate
              </button>
            </div>
          </div>
        ))}
      </CardGrid>
    </>
  );
};
