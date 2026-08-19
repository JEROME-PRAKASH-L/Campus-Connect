'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ICONS } from '@/lib/utilities/icons';
import { useShell } from '@/components/layout/AppShell';
import { PageHeader, PageState } from '@/components/ui/PageHeader';
import { Bar, Chips, KpiCards, Tag } from '@/components/ui/primitives';
import { BarChart } from '@/components/ui/blocks';
import { DataTable, TwoLine } from '@/components/tables/DataTable';

type StudentResults = {
  scope: 'student';
  cgpa: number;
  creditsEarned: number;
  arrears: number;
  semesters: { number: number; label: string; gpa: number; credits: number; publishedOn: string; rows: { code: string; name: string; credits: number; grade: string; gradePoint: number; creditPoint: number }[] }[];
  currentSemester: {
    number: number;
    label: string;
    provisionalGpa: number;
    rows: { code: string; name: string; internal1: number | null; internal2: number | null; assignment: number | null; practical: number | null; total: number; grade: string }[];
  };
};

type DepartmentResults = { scope: 'department'; departments: { code: string; name: string; passPercentage: number; studentCount: number }[] };

export const Results = () => {
  const { toast } = useShell();
  const [data, setData] = useState<StudentResults | DepartmentResults | null>(null);
  const [selected, setSelected] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api<StudentResults | DepartmentResults>('/api/results')
      .then((d) => {
        setData(d);
        if (d.scope === 'student' && d.semesters.length) setSelected(d.semesters[d.semesters.length - 1].label);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load results.'));
  }, []);

  if (error) return <PageState>{error}</PageState>;
  if (!data) return <PageState>Loading results…</PageState>;

  if (data.scope === 'department') {
    const institute = data.departments.reduce((s, d) => s + d.passPercentage * d.studentCount, 0) / data.departments.reduce((s, d) => s + d.studentCount, 0);
    return (
      <>
        <PageHeader kicker="Examination results" title="Results" sub="Pass percentage by department for the most recently published cycle." actions={[]} />
        <KpiCards
          kpis={[
            { label: 'Institute pass %', value: `${institute.toFixed(1)}%`, sub: 'Weighted by strength', icon: ICONS.cap, tone: 'var(--status-ok)', bar: `${institute}%` },
            { label: 'Best', value: `${data.departments[0].code}`, sub: `${data.departments[0].passPercentage}% pass`, icon: ICONS.award, tone: 'var(--status-ok)', bar: '96%' },
            { label: 'Departments', value: String(data.departments.length), sub: 'Reporting results', icon: ICONS.users, tone: 'var(--color-accent)', bar: '100%' },
            { label: 'Below 90%', value: String(data.departments.filter((d) => d.passPercentage < 90).length), sub: 'Flagged for review', icon: ICONS.chart, tone: 'var(--status-warn)', bar: '30%' },
          ]}
        />
        <BarChart
          title="Pass percentage by department"
          meta="Latest published results"
          bars={data.departments.map((d) => ({ label: d.code, value: d.passPercentage.toFixed(1), height: d.passPercentage }))}
          note={`Institute pass percentage ${institute.toFixed(1)}%.`}
        />
        <DataTable
          title="Department results"
          sub="Most recent cycle"
          columns={[{ label: 'Department' }, { label: 'Students', align: 'right' }, { label: 'Pass percentage', width: '220px' }]}
          rows={data.departments.map((d) => ({ key: d.code, cells: [<TwoLine key="n" top={d.name} bottom={d.code} />, String(d.studentCount), <Bar key="b" value={d.passPercentage} tone="var(--status-ok)" />] }))}
        />
      </>
    );
  }

  const options = [...data.semesters.map((s) => s.label), data.currentSemester.label];
  const active = selected || options[options.length - 2] || options[0];
  const isCurrent = active === data.currentSemester.label;
  const semester = data.semesters.find((s) => s.label === active);
  const latest = data.semesters[data.semesters.length - 1];

  return (
    <>
      <PageHeader
        kicker="Examination results"
        title="Results"
        sub="Semester-wise grade sheets, GPA and the cumulative average across the programme."
        actions={[{ label: 'Grade sheet', icon: ICONS.down, onClick: () => toast('Consolidated grade sheet downloaded.') }]}
      />
      <KpiCards
        kpis={[
          { label: 'CGPA', value: data.cgpa.toFixed(2), sub: `${data.creditsEarned} credits · ${data.semesters.length} semesters`, icon: ICONS.cap, tone: 'var(--color-accent)', bar: `${data.cgpa * 10}%` },
          { label: 'Latest GPA', value: latest ? latest.gpa.toFixed(2) : '—', sub: latest?.label ?? '', icon: ICONS.chart, tone: 'var(--status-ok)', bar: `${(latest?.gpa ?? 0) * 10}%` },
          { label: 'Credits earned', value: String(data.creditsEarned), sub: 'Towards the programme', icon: ICONS.award, tone: 'var(--color-accent)', bar: '78%' },
          { label: 'Arrears', value: String(data.arrears), sub: data.arrears ? 'Pending papers' : 'No pending papers', icon: ICONS.file, tone: data.arrears ? 'var(--status-bad)' : 'var(--status-ok)', bar: '100%' },
        ]}
      />
      <BarChart
        title="GPA trend"
        meta="Per semester · *provisional"
        bars={[
          ...data.semesters.map((s) => ({ label: `Sem ${s.number}`, value: s.gpa.toFixed(2), height: (s.gpa / 10) * 100 })),
          { label: `Sem ${data.currentSemester.number}*`, value: data.currentSemester.provisionalGpa.toFixed(2), height: (data.currentSemester.provisionalGpa / 10) * 100, tone: 'var(--status-ok)' },
        ]}
        note={`CGPA ${data.cgpa.toFixed(2)}. The current semester is provisional on internals only.`}
      />

      {isCurrent ? (
        <DataTable
          title={data.currentSemester.label}
          sub="Grade sheet"
          controls={<Chips options={options} value={active} onChange={setSelected} />}
          columns={[{ label: 'Subject' }, { label: 'IA-1', align: 'right' }, { label: 'IA-2', align: 'right' }, { label: 'Assignment', align: 'right' }, { label: 'Practical', align: 'right' }, { label: 'Total', width: '170px' }, { label: 'Grade' }]}
          rows={data.currentSemester.rows.map((r) => ({
            key: r.code,
            cells: [
              <TwoLine key="n" top={r.name} bottom={r.code} />,
              r.internal1 ?? '—',
              r.internal2 ?? '—',
              r.assignment ?? '—',
              r.practical ?? '—',
              <Bar key="b" value={r.total} tone={r.total >= 75 ? 'var(--status-ok)' : r.total >= 60 ? 'var(--color-accent)' : 'var(--status-warn)'} />,
              <Tag key="t" kind={r.grade === 'O' || r.grade === 'A+' ? 'tag-accent' : 'tag-neutral'}>
                {r.grade}
              </Tag>,
            ],
          }))}
          note="Provisional. Semester marks are not included until the end-semester examination is valued."
        />
      ) : (
        <DataTable
          title={active}
          sub="Grade sheet"
          controls={<Chips options={options} value={active} onChange={setSelected} />}
          columns={[{ label: 'Subject' }, { label: 'Code' }, { label: 'Credits', align: 'right' }, { label: 'Grade' }, { label: 'Grade point', align: 'right' }, { label: 'Credit point', align: 'right' }]}
          rows={(semester?.rows ?? []).map((r) => ({
            key: r.code,
            cells: [
              r.name,
              r.code,
              String(r.credits),
              <Tag key="t" kind={r.gradePoint >= 9 ? 'tag-accent' : 'tag-neutral'}>
                {r.grade}
              </Tag>,
              String(r.gradePoint),
              String(r.creditPoint),
            ],
          }))}
          note={semester ? `GPA ${semester.gpa.toFixed(2)} from ${semester.credits} credits. Published ${new Date(semester.publishedOn).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}.` : ''}
        />
      )}
    </>
  );
};
