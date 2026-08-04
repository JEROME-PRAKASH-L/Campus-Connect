'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, post } from '@/lib/api';
import { ICONS } from '@/lib/icons';
import { attendanceTone } from '@/lib/format';
import { useShell } from '@/components/AppShell';
import { PageHeader, PageState } from '@/components/PageHeader';
import { KpiCards, Section, Bar, Tag, Select } from '@/components/primitives';
import { AttendanceDonut } from '@/components/blocks';
import { DataTable, TwoLine } from '@/components/DataTable';

type Mark = 'PRESENT' | 'ABSENT' | 'ON_DUTY' | 'LEAVE';

const MARK_OPTIONS: { key: Mark; short: string; label: string; tone: string }[] = [
  { key: 'PRESENT', short: 'P', label: 'Present', tone: 'var(--status-ok)' },
  { key: 'ABSENT', short: 'A', label: 'Absent', tone: 'var(--status-bad)' },
  { key: 'ON_DUTY', short: 'OD', label: 'On duty', tone: 'var(--color-accent)' },
  { key: 'LEAVE', short: 'L', label: 'Leave', tone: 'var(--status-warn)' },
];

type StudentView = {
  scope: 'student';
  student: { name: string; registerNumber: string; section: string };
  subjects: { id: string; code: string; name: string; shortName: string; kind: string; faculty: string; held: number; attended: number; percentage: number }[];
  overall: { held: number; attended: number; percentage: number };
};

type DepartmentView = {
  scope: 'department';
  departments: { code: string; name: string; hodName: string; studentCount: number; facultyCount: number; avgAttendance: number }[];
  institute: number;
};

type FacultyView = {
  scope: 'faculty';
  subjects: { id: string; code: string; name: string; shortName: string; kind: string; percentage: number; sessions: number }[];
};

type Register = {
  subject: { id: string; code: string; name: string };
  section: string;
  students: { id: string; name: string; registerNumber: string; cumulative: number; mark: Mark | null }[];
};

const FacultyMarker = () => {
  const { toast, go } = useShell();
  const [subjects, setSubjects] = useState<FacultyView['subjects']>([]);
  const [subjectId, setSubjectId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [register, setRegister] = useState<Register | null>(null);
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const [sessions, setSessions] = useState<{ date: string; code: string; name: string; percentage: number }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api<FacultyView>('/api/attendance')
      .then((d) => {
        setSubjects(d.subjects);
        setSubjectId((current) => current || d.subjects[0]?.id || '');
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load your subjects.'));
    api<{ sessions: typeof sessions }>('/api/attendance/sessions')
      .then((d) => setSessions(d.sessions))
      .catch(() => setSessions([]));
  }, []);

  const loadRegister = useCallback(async () => {
    if (!subjectId) return;
    const data = await api<Register>(`/api/attendance/register?subjectId=${subjectId}&date=${date}&period=1`);
    setRegister(data);
    setMarks(Object.fromEntries(data.students.map((s) => [s.id, s.mark ?? 'PRESENT'])) as Record<string, Mark>);
  }, [subjectId, date]);

  useEffect(() => {
    loadRegister().catch((e) => setError(e instanceof Error ? e.message : 'Could not load the register.'));
  }, [loadRegister]);

  if (error) return <PageState>{error}</PageState>;
  if (!register) return <PageState>Loading the register…</PageState>;

  const tally = MARK_OPTIONS.map((o) => ({ ...o, count: Object.values(marks).filter((m) => m === o.key).length }));
  const sessionPct = register.students.length
    ? Math.round((Object.values(marks).filter((m) => m === 'PRESENT' || m === 'ON_DUTY').length / register.students.length) * 100)
    : 0;

  const save = async () => {
    setSaving(true);
    try {
      const result = await post<{ tally: Record<string, number> }>('/api/attendance/register', {
        subjectId,
        date,
        period: 1,
        marks: Object.entries(marks).map(([studentId, mark]) => ({ studentId, mark })),
      });
      const t = result.tally;
      toast(`Saved · ${register.subject.code} · ${t.PRESENT ?? 0} present, ${t.ABSENT ?? 0} absent, ${t.ON_DUTY ?? 0} OD, ${t.LEAVE ?? 0} leave.`);
      await loadRegister();
      const refreshed = await api<{ sessions: typeof sessions }>('/api/attendance/sessions');
      setSessions(refreshed.sessions);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not save the register.');
    }
    setSaving(false);
  };

  const setAll = (mark: Mark) => setMarks(Object.fromEntries(register.students.map((s) => [s.id, mark])) as Record<string, Mark>);

  return (
    <>
      <PageHeader
        kicker="Attendance register"
        title="Take attendance"
        sub="Select the class, mark each student, then save. Percentages recalculate across the portal immediately."
        actions={[{ label: 'Shortage report', icon: ICONS.chart, onClick: () => go('reports'), primary: true }]}
      />

      <Section style={{ gap: 'var(--space-4)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(148px,1fr))', gap: 'var(--space-3)' }}>
          <div className="field">
            <label htmlFor="mk-subject">Subject</label>
            <select id="mk-subject" className="input" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} · {s.shortName}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="mk-section">Section</label>
            <input id="mk-section" className="input" value={register.section} readOnly />
          </div>
          <div className="field">
            <label htmlFor="mk-date">Date</label>
            <input id="mk-date" className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)', flexWrap: 'wrap', borderTop: '1px solid var(--color-divider)', borderBottom: '1px solid var(--color-divider)', padding: '10px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
            {tally.map((t) => (
              <div key={t.key} style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 20, color: t.tone }}>{t.count}</span>
                <span className="eyebrow" style={{ whiteSpace: 'nowrap' }}>
                  {t.label}
                </span>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, paddingLeft: 'var(--space-3)', borderLeft: '1px solid var(--color-divider)' }}>
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 20, color: 'var(--color-accent)' }}>{sessionPct}%</span>
              <span className="eyebrow" style={{ whiteSpace: 'nowrap' }}>
                Session %
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-secondary" style={{ fontSize: 12.5 }} onClick={() => setAll('PRESENT')}>
              Mark all present
            </button>
            <button type="button" className="btn btn-secondary" style={{ fontSize: 12.5 }} onClick={() => void loadRegister()}>
              Reset
            </button>
            <button type="button" className="btn btn-primary" style={{ fontSize: 12.5 }} onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save attendance'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 520, overflowY: 'auto', paddingRight: 2 }}>
          {register.students.map((s, index) => {
            const current = marks[s.id] ?? 'PRESENT';
            const option = MARK_OPTIONS.find((o) => o.key === current)!;
            return (
              <div
                key={s.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '7px 9px',
                  borderRadius: 10,
                  border: `1px solid ${current === 'PRESENT' ? 'var(--color-divider)' : option.tone}`,
                  background: current === 'PRESENT' ? 'transparent' : `color-mix(in srgb, ${option.tone} 9%, transparent)`,
                }}
              >
                <span style={{ width: 26, fontSize: 11, opacity: 0.62, fontFamily: 'var(--font-heading)' }}>{String(index + 1).padStart(2, '0')}</span>
                <span style={{ width: 30, height: 30, flex: 'none', display: 'grid', placeItems: 'center', border: '1px solid var(--color-divider)', borderRadius: 8, fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 11.5, color: 'var(--color-accent)' }}>
                  {s.name.split(' ').map((p) => p[0]).join('')}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13.5 }}>{s.name}</span>
                  <span style={{ display: 'block', fontSize: 11, opacity: 0.72 }}>
                    {s.registerNumber} · {s.cumulative}% cumulative
                  </span>
                </span>
                {s.cumulative < 75 ? (
                  <span style={{ fontSize: 11, color: 'var(--status-bad)', width: 96, textAlign: 'right' }}>Shortage</span>
                ) : (
                  <span style={{ width: 96 }} />
                )}
                <span style={{ display: 'flex', border: '1px solid var(--color-divider)', borderRadius: 8, overflow: 'hidden' }}>
                  {MARK_OPTIONS.map((o, i) => (
                    <button
                      key={o.key}
                      type="button"
                      title={o.label}
                      aria-label={`${s.name}: ${o.label}`}
                      aria-pressed={current === o.key}
                      onClick={() => setMarks((prev) => ({ ...prev, [s.id]: o.key }))}
                      style={{
                        width: 36,
                        height: 31,
                        border: 0,
                        borderLeft: i === 0 ? 0 : '1px solid var(--color-divider)',
                        cursor: 'pointer',
                        background: current === o.key ? o.tone : 'transparent',
                        color: current === o.key ? '#fff' : 'var(--color-text)',
                        fontFamily: 'var(--font-heading)',
                        fontWeight: 700,
                        fontSize: 12.5,
                        transition: 'background .14s',
                      }}
                    >
                      {o.short}
                    </button>
                  ))}
                </span>
              </div>
            );
          })}
        </div>
      </Section>

      <DataTable
        title="Recent sessions"
        sub="Your last five saved registers"
        columns={[{ label: 'Date' }, { label: 'Subject' }, { label: 'Marked', width: '190px' }]}
        rows={sessions.map((s, i) => ({
          key: `${s.date}-${s.code}-${i}`,
          cells: [new Date(s.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), s.code, <Bar key="bar" value={s.percentage} tone={attendanceTone(s.percentage)} />],
        }))}
        note="Registers stay editable for 48 hours; after that a correction has to be countersigned by the HOD."
        emptyLabel="No registers saved yet."
      />
    </>
  );
};

export const Attendance = () => {
  const { user, toast } = useShell();
  const [data, setData] = useState<StudentView | DepartmentView | null>(null);
  const [error, setError] = useState('');

  const isFaculty = user.role === 'FACULTY';

  useEffect(() => {
    if (isFaculty) return;
    api<StudentView | DepartmentView>('/api/attendance')
      .then((d) => setData(d as StudentView | DepartmentView))
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load attendance.'));
  }, [isFaculty]);

  if (isFaculty) return <FacultyMarker />;
  if (error) return <PageState>{error}</PageState>;
  if (!data) return <PageState>Loading attendance…</PageState>;

  if (data.scope === 'department') {
    const lowest = [...data.departments].sort((a, b) => a.avgAttendance - b.avgAttendance)[0];
    const best = [...data.departments].sort((a, b) => b.avgAttendance - a.avgAttendance)[0];
    return (
      <>
        <PageHeader
          kicker="Attendance monitoring"
          title="Attendance monitoring"
          sub="Live percentages by department. Anything under 85% is flagged for departmental review."
          actions={[{ label: 'Download statement', icon: ICONS.down, onClick: () => toast('Attendance statement downloaded.') }]}
        />
        <KpiCards
          kpis={[
            { label: 'Institute', value: `${data.institute}%`, sub: 'Rolling 30 days', icon: ICONS.att, tone: attendanceTone(data.institute), bar: `${data.institute}%` },
            { label: 'Best', value: `${best.code} ${best.avgAttendance}%`, sub: best.name, icon: ICONS.chart, tone: 'var(--status-ok)', bar: `${best.avgAttendance}%` },
            { label: 'Lowest', value: `${lowest.code} ${lowest.avgAttendance}%`, sub: 'Below the 85% target', icon: ICONS.chart, tone: 'var(--status-bad)', bar: `${lowest.avgAttendance}%` },
            { label: 'Departments', value: String(data.departments.length), sub: 'Under monitoring', icon: ICONS.users, tone: 'var(--color-accent)', bar: '100%' },
          ]}
        />
        <AttendanceDonut
          title="Attendance by department"
          meta="This month"
          percentage={data.institute}
          caption="INSTITUTE AVG"
          bars={data.departments.slice(0, 5).map((d) => ({ label: d.code, value: d.avgAttendance }))}
          note={`${lowest.name} is ${(data.institute - lowest.avgAttendance).toFixed(1)} points below the institute average — flagged for review.`}
        />
        <DataTable
          title="Department register"
          sub="Semester to date"
          columns={[{ label: 'Department' }, { label: 'Students', align: 'right' }, { label: 'Faculty', align: 'right' }, { label: 'Attendance', width: '200px' }, { label: 'Status' }]}
          rows={data.departments.map((d) => ({
            key: d.code,
            cells: [
              <TwoLine key="n" top={d.name} bottom={`${d.code} · ${d.hodName}`} />,
              String(d.studentCount),
              String(d.facultyCount),
              <Bar key="b" value={d.avgAttendance} tone={attendanceTone(d.avgAttendance)} />,
              <Tag key="t" kind={d.avgAttendance >= 85 ? 'tag-accent' : 'tag-neutral'}>
                {d.avgAttendance >= 85 ? 'On track' : 'Review'}
              </Tag>,
            ],
          }))}
          note="Figures refresh every time a faculty member saves a register."
        />
      </>
    );
  }

  const atRisk = data.subjects.filter((s) => s.held > 0 && s.percentage < 75);
  const best = [...data.subjects].filter((s) => s.held > 0).sort((a, b) => b.percentage - a.percentage)[0];

  return (
    <>
      <PageHeader
        kicker={data.student.section ? `Section ${data.student.section}` : 'Attendance'}
        title="My attendance"
        sub="Subject-wise attendance for the current semester. 75% is required to sit the semester examination."
        actions={[{ label: 'Download statement', icon: ICONS.down, onClick: () => toast('Attendance statement downloaded.') }]}
      />
      <KpiCards
        kpis={[
          { label: 'Overall', value: `${data.overall.percentage}%`, sub: `${data.overall.attended} of ${data.overall.held} periods`, icon: ICONS.att, tone: attendanceTone(data.overall.percentage), bar: `${data.overall.percentage}%` },
          { label: 'Best subject', value: best ? `${best.percentage}%` : '—', sub: best?.name ?? '', icon: ICONS.cap, tone: 'var(--status-ok)', bar: `${best?.percentage ?? 0}%` },
          { label: 'At risk', value: String(atRisk.length), sub: atRisk.length ? `${atRisk[0].code} · ${atRisk[0].percentage}%` : 'None below 75%', icon: ICONS.chart, tone: atRisk.length ? 'var(--status-bad)' : 'var(--status-ok)', bar: '15%' },
          { label: 'Periods missed', value: String(data.overall.held - data.overall.attended), sub: 'This semester', icon: ICONS.clock, tone: 'var(--status-warn)', bar: '35%' },
        ]}
      />
      <AttendanceDonut
        title="Attendance overview"
        meta={`${data.overall.attended} / ${data.overall.held} periods`}
        percentage={data.overall.percentage}
        caption="OVERALL"
        bars={data.subjects.slice(0, 5).map((s) => ({ label: s.shortName, value: s.percentage }))}
        note={atRisk.length ? `${atRisk[0].code} is short by ${(75 - atRisk[0].percentage).toFixed(1)} points.` : 'Every subject is above the 75% requirement.'}
      />
      <DataTable
        title="Subject-wise attendance"
        sub="Current semester"
        columns={[{ label: 'Subject' }, { label: 'Type' }, { label: 'Held', align: 'right' }, { label: 'Attended', align: 'right' }, { label: 'Percentage', width: '200px' }, { label: 'Status' }]}
        rows={data.subjects.map((s) => ({
          key: s.id,
          cells: [
            <TwoLine key="n" top={s.name} bottom={`${s.code} · ${s.faculty}`} />,
            s.kind === 'PRACTICAL' ? 'Practical' : 'Theory',
            String(s.held),
            String(s.attended),
            <Bar key="b" value={s.percentage} tone={attendanceTone(s.percentage)} />,
            <Tag key="t" kind={s.percentage >= 75 ? 'tag-accent' : 'tag-neutral'}>
              {s.percentage >= 85 ? 'Good' : s.percentage >= 75 ? 'Watch' : 'Shortage'}
            </Tag>,
          ],
        }))}
        note="On-duty periods count towards attendance. Medical leave is excluded from the denominator."
      />
    </>
  );
};
