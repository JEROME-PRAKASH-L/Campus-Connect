'use client';

import { useEffect, useState } from 'react';
import { api, post } from '@/lib/api';
import { ICONS } from '@/lib/utilities/icons';
import { attendanceTone } from '@/lib/utilities/format';
import { useShell } from '@/components/layout/AppShell';
import { PageHeader, PageState } from '@/components/ui/PageHeader';
import { KpiCards, Tag } from '@/components/ui/primitives';
import { CardGrid } from '@/components/ui/blocks';
import { DataTable, TwoLine } from '@/components/tables/DataTable';

type StudentAcademics = {
  scope: 'student';
  subjects: { id: string; code: string; name: string; shortName: string; kind: string; credits: number; room: string; faculty: string; held: number; percentage: number; rating: number }[];
  creditsEarned: number;
  feedbackGiven: number;
};

type DepartmentAcademics = {
  scope: 'department';
  subjects: { id: string; code: string; name: string; shortName: string; credits: number; kind: string; faculty: string; facultyId: string | null; sections: number; hours: number }[];
  facultyOptions: { id: string; name: string }[];
};

type InstituteAcademics = {
  scope: 'institute';
  departments: { code: string; name: string; hodName: string; facultyCount: number; studentCount: number; passPercentage: number; block: string }[];
  courses: { id: string; code: string; name: string; department: string }[];
};

type Data = StudentAcademics | DepartmentAcademics | InstituteAcademics;

export const Academics = () => {
  const { toast, openModal, closeModal } = useShell();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');

  const load = () =>
    api<Data>('/api/academics')
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load academics.'));

  useEffect(() => {
    void load();
  }, []);

  if (error) return <PageState>{error}</PageState>;
  if (!data) return <PageState>Loading academics…</PageState>;

  if (data.scope === 'student') {
    const rate = async (subjectId: string, rating: number, faculty: string) => {
      await post('/api/academics/feedback', { subjectId, rating });
      toast(`Feedback recorded for ${faculty}.`);
      await load();
    };
    const totalCredits = data.subjects.reduce((sum, s) => sum + s.credits, 0);
    return (
      <>
        <PageHeader
          kicker="Curriculum"
          title="Academics"
          sub={`${data.subjects.length} registered subjects worth ${totalCredits} credits. Faculty feedback is anonymous.`}
          actions={[{ label: 'Syllabus', icon: ICONS.down, onClick: () => toast('Semester syllabus downloaded.') }]}
        />
        <KpiCards
          kpis={[
            { label: 'Registered subjects', value: String(data.subjects.length), sub: `${totalCredits} credits`, icon: ICONS.cap, tone: 'var(--color-accent)', bar: '70%' },
            { label: 'Credits earned', value: String(data.creditsEarned), sub: 'Completed semesters', icon: ICONS.chart, tone: 'var(--color-accent)', bar: '82%' },
            { label: 'Feedback given', value: `${data.feedbackGiven} / ${data.subjects.length}`, sub: 'Anonymous to faculty', icon: ICONS.file, tone: data.feedbackGiven === data.subjects.length ? 'var(--status-ok)' : 'var(--status-warn)', bar: `${(data.feedbackGiven / Math.max(data.subjects.length, 1)) * 100}%` },
            { label: 'Practicals', value: String(data.subjects.filter((s) => s.kind === 'PRACTICAL').length), sub: 'Laboratory subjects', icon: ICONS.cap, tone: 'var(--color-accent)', bar: '40%' },
          ]}
        />
        <CardGrid>
          {data.subjects.map((s) => (
            <div key={s.id} className="card anim-fade-up" style={{ padding: 20, paddingTop: 22, gap: 'var(--space-2)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <span className="card-kicker">
                  {s.code} · {s.credits} credits
                </span>
                <Tag kind={s.kind === 'PRACTICAL' ? 'tag-neutral' : 'tag-accent'}>{s.kind === 'PRACTICAL' ? 'Practical' : 'Theory'}</Tag>
              </div>
              <div className="card-title">{s.name}</div>
              <p className="card-body">
                {s.faculty} · Room {s.room}. {s.held} periods held this semester.
              </p>
              <div style={{ marginTop: 2 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, opacity: 0.72, marginBottom: 4 }}>
                  <span>Attendance</span>
                  <span>{s.percentage}%</span>
                </div>
                <div style={{ height: 5, background: 'var(--color-divider)' }}>
                  <div className="anim-grow" style={{ height: 5, width: `${Math.min(s.percentage, 100)}%`, background: attendanceTone(s.percentage) }} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 2 }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      title={`${n} of 5`}
                      aria-label={`Rate ${s.faculty} ${n} of 5`}
                      onClick={() => void rate(s.id, n, s.faculty)}
                      style={{ width: 19, height: 19, padding: 0, borderRadius: 4, border: `1px solid ${n <= s.rating ? 'var(--color-accent)' : 'var(--color-divider)'}`, background: n <= s.rating ? 'var(--color-accent)' : 'transparent', cursor: 'pointer', transition: 'background .14s' }}
                    />
                  ))}
                </div>
                <span style={{ fontSize: 11.5, opacity: 0.72 }}>{s.rating ? `Rated ${s.rating} / 5` : 'Rate this faculty'}</span>
              </div>
            </div>
          ))}
        </CardGrid>
      </>
    );
  }

  if (data.scope === 'institute') {
    return (
      <>
        <PageHeader
          kicker="Institute"
          title="Departments & courses"
          sub="Every department, the programmes it runs and the staff strength behind each."
          actions={[]}
        />
        <KpiCards
          kpis={[
            { label: 'Departments', value: String(data.departments.length), sub: 'Running this semester', icon: ICONS.cap, tone: 'var(--color-accent)', bar: '60%' },
            { label: 'Programmes', value: String(data.courses.length), sub: 'Across all departments', icon: ICONS.book, tone: 'var(--color-accent)', bar: '55%' },
            { label: 'Faculty', value: String(data.departments.reduce((s, d) => s + d.facultyCount, 0)), sub: 'On roll', icon: ICONS.users, tone: 'var(--color-accent)', bar: '58%' },
            { label: 'Students', value: data.departments.reduce((s, d) => s + d.studentCount, 0).toLocaleString('en-IN'), sub: 'Enrolled', icon: ICONS.users, tone: 'var(--color-accent)', bar: '86%' },
          ]}
        />
        <DataTable
          title="Departments"
          sub="Current academic year"
          columns={[{ label: 'Department' }, { label: 'Head' }, { label: 'Faculty', align: 'right' }, { label: 'Students', align: 'right' }, { label: 'Pass %', align: 'right' }]}
          rows={data.departments.map((d) => ({
            key: d.code,
            cells: [<TwoLine key="n" top={d.name} bottom={`${d.code} · ${d.block}`} />, d.hodName, String(d.facultyCount), String(d.studentCount), `${d.passPercentage}%`],
          }))}
          note="Pass percentage is taken from the most recently published results."
        />
      </>
    );
  }

  const reassign = (subjectId: string, code: string) =>
    openModal({
      kicker: 'Subject allocation',
      title: `Reassign ${code}`,
      sub: 'Updates the timetable immediately.',
      fields: [{ key: 'facultyId', label: 'Faculty', kind: 'select', options: data.facultyOptions.map((f) => ({ value: f.id, label: f.name })) }],
      confirmLabel: 'Save allocation',
      onConfirm: async (form) => {
        const result = await post<{ subject: { code: string; faculty: string } }>('/api/academics/allocate', { subjectId, facultyId: form.facultyId });
        closeModal();
        toast(`${result.subject.code} reallocated to ${result.subject.faculty}.`);
        await load();
      },
    });

  return (
    <>
      <PageHeader
        kicker="Department"
        title="Subject allocation"
        sub="Who teaches what this semester, and the contact hours each allocation carries."
        actions={[]}
      />
      <KpiCards
        kpis={[
          { label: 'Subjects', value: String(data.subjects.length), sub: 'Running this semester', icon: ICONS.cap, tone: 'var(--color-accent)', bar: '60%' },
          { label: 'Faculty', value: String(data.facultyOptions.length), sub: 'On roll', icon: ICONS.users, tone: 'var(--color-accent)', bar: '58%' },
          { label: 'Total hours', value: `${data.subjects.reduce((s, x) => s + x.hours, 0)} h`, sub: 'Contact hours allocated', icon: ICONS.clock, tone: 'var(--status-ok)', bar: '82%' },
          { label: 'Unallocated', value: String(data.subjects.filter((s) => !s.facultyId).length), sub: 'Awaiting a faculty member', icon: ICONS.file, tone: data.subjects.some((s) => !s.facultyId) ? 'var(--status-warn)' : 'var(--status-ok)', bar: '8%' },
        ]}
      />
      <DataTable
        title="Allocation & workload"
        sub="Current semester"
        columns={[{ label: 'Subject' }, { label: 'Faculty' }, { label: 'Type' }, { label: 'Sections', align: 'right' }, { label: 'Hours', align: 'right' }, { label: '', align: 'right', width: '130px' }]}
        rows={data.subjects.map((s) => ({
          key: s.id,
          cells: [
            <TwoLine key="n" top={s.name} bottom={`${s.code} · ${s.credits} credits`} />,
            s.faculty,
            s.kind === 'PRACTICAL' ? 'Practical' : 'Theory',
            String(s.sections),
            `${s.hours} h`,
            <button key="b" type="button" className="btn btn-secondary" style={{ fontSize: 11.5, padding: '3px 9px' }} onClick={() => reassign(s.id, s.code)}>
              Reassign
            </button>,
          ],
        }))}
        note="Workload is counted in contact hours; laboratory hours count at 0.75."
      />
    </>
  );
};
