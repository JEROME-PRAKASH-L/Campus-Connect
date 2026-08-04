'use client';

import { useEffect, useState } from 'react';
import { api, post } from '@/lib/api';
import { ICONS } from '@/lib/icons';
import { shortDate } from '@/lib/format';
import { useShell } from '@/components/AppShell';
import { PageHeader, PageState } from '@/components/PageHeader';
import { Bar, KpiCards, Tag } from '@/components/primitives';
import { CardGrid } from '@/components/blocks';
import { DataTable, TwoLine } from '@/components/DataTable';

type StudentAssignment = {
  id: string;
  title: string;
  brief: string;
  dueDate: string;
  maxMarks: number;
  subject: { code: string; shortName: string; name: string };
  status: 'PENDING' | 'SUBMITTED' | 'GRADED';
  score: number | null;
  fileCount: number;
  feedback: string;
};

type FacultyAssignment = {
  id: string;
  title: string;
  brief: string;
  dueDate: string;
  maxMarks: number;
  subject: { code: string; shortName: string; name: string };
  section: string;
  total: number;
  submitted: number;
  graded: number;
  averageScore: number | null;
  submissions: { studentId: string; name: string; registerNumber: string; status: string; score: number | null }[];
};

type Data = { scope: 'student'; assignments: StudentAssignment[] } | { scope: 'faculty'; assignments: FacultyAssignment[] };

const STATUS_LABEL: Record<string, string> = { PENDING: 'Pending', SUBMITTED: 'Submitted', GRADED: 'Graded' };

export const Assignments = () => {
  const { user, toast, openModal, closeModal, refreshNotifications } = useShell();
  const [data, setData] = useState<Data | null>(null);
  const [subjects, setSubjects] = useState<{ id: string; code: string; shortName: string }[]>([]);
  const [error, setError] = useState('');

  const load = () =>
    api<Data>('/api/assignments')
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load assignments.'));

  useEffect(() => {
    void load();
    api<{ subjects: { id: string; code: string; shortName: string }[] }>('/api/materials')
      .then((d) => setSubjects(d.subjects))
      .catch(() => setSubjects([]));
  }, []);

  if (error) return <PageState>{error}</PageState>;
  if (!data) return <PageState>Loading assignments…</PageState>;

  if (data.scope === 'student') {
    const pending = data.assignments.filter((a) => a.status === 'PENDING');
    const graded = data.assignments.filter((a) => a.status === 'GRADED');
    const average = graded.length ? (graded.reduce((s, a) => s + (a.score ?? 0), 0) / graded.length).toFixed(1) : '—';
    const nextDue = [...pending].sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate))[0];

    const submit = (assignment: StudentAssignment) =>
      openModal({
        kicker: `${assignment.subject.code} · due ${shortDate(assignment.dueDate)}`,
        title: 'Submit assignment',
        sub: assignment.title,
        fields: [
          { key: 'file', label: 'Attachment', kind: 'file', value: 'Drop a PDF, notebook or archive here (max 25 MB)', span: 2 },
          { key: 'note', label: 'Note for the faculty', kind: 'area', placeholder: 'Optional', span: 2 },
        ],
        note: 'Late submissions are accepted for 48 hours with a 10% penalty.',
        confirmLabel: 'Submit work',
        onConfirm: async (form) => {
          await post(`/api/assignments/${assignment.id}/submit`, { note: form.note ?? '' });
          closeModal();
          toast(`${assignment.subject.code} submitted. Receipt emailed.`);
          await load();
          await refreshNotifications();
        },
      });

    return (
      <>
        <PageHeader
          kicker="Coursework"
          title="Assignments"
          sub={pending.length ? `${pending.length} submissions are still open. The nearest deadline is ${shortDate(nextDue.dueDate)}.` : 'Everything set for you has been submitted.'}
          actions={[]}
        />
        <KpiCards
          kpis={[
            { label: 'Pending', value: String(pending.length), sub: nextDue ? `Next due ${shortDate(nextDue.dueDate)}` : 'Nothing outstanding', icon: ICONS.file, tone: pending.length ? 'var(--status-warn)' : 'var(--status-ok)', bar: '60%' },
            { label: 'Submitted', value: String(data.assignments.filter((a) => a.status === 'SUBMITTED').length), sub: 'Awaiting a grade', icon: ICONS.att, tone: 'var(--color-accent)', bar: '40%' },
            { label: 'Average score', value: graded.length ? `${average} / 20` : '—', sub: 'Graded work', icon: ICONS.cap, tone: 'var(--status-ok)', bar: '92%' },
            { label: 'Total set', value: String(data.assignments.length), sub: 'This semester', icon: ICONS.clock, tone: 'var(--color-accent)', bar: '100%' },
          ]}
        />
        <CardGrid>
          {data.assignments.map((a) => (
            <div key={a.id} className="card anim-fade-up" style={{ padding: 20, paddingTop: 22, gap: 'var(--space-2)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <span className="card-kicker">
                  {a.subject.code} · {a.subject.shortName}
                </span>
                <Tag kind={a.status === 'PENDING' ? 'tag-neutral' : 'tag-accent'}>{STATUS_LABEL[a.status]}</Tag>
              </div>
              <div className="card-title">{a.title}</div>
              <p className="card-body">{a.brief}</p>
              {a.score !== null ? (
                <div style={{ marginTop: 2 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, opacity: 0.72, marginBottom: 4 }}>
                    <span>Score</span>
                    <span>
                      {a.score} / {a.maxMarks}
                    </span>
                  </div>
                  <div style={{ height: 5, background: 'var(--color-divider)' }}>
                    <div className="anim-grow" style={{ height: 5, width: `${(a.score / a.maxMarks) * 100}%`, background: 'var(--status-ok)' }} />
                  </div>
                </div>
              ) : null}
              <div className="card-meta" style={{ justifyContent: 'space-between', borderTop: '1px solid var(--color-divider)', paddingTop: 9, marginTop: 3, gap: 8, flexWrap: 'wrap' }}>
                <span>
                  Due {shortDate(a.dueDate)}
                  {a.fileCount ? ` · ${a.fileCount} file(s)` : ''}
                </span>
                {a.status === 'PENDING' ? (
                  <button type="button" className="btn btn-primary" style={{ fontSize: 11.5, padding: '4px 10px' }} onClick={() => submit(a)}>
                    Submit
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: 11.5, padding: '4px 10px' }}
                    onClick={() =>
                      openModal({
                        kicker: a.subject.code,
                        title: a.title,
                        sub: a.status === 'GRADED' ? 'Graded' : 'Awaiting a grade',
                        rows: [
                          { k: 'Score', v: a.score !== null ? `${a.score} / ${a.maxMarks}` : 'Not graded yet' },
                          { k: 'Due', v: shortDate(a.dueDate) },
                          { k: 'Files', v: String(a.fileCount) },
                        ],
                        note: a.feedback || 'No written feedback recorded.',
                        cancelLabel: 'Close',
                      })
                    }
                  >
                    View feedback
                  </button>
                )}
              </div>
            </div>
          ))}
        </CardGrid>
      </>
    );
  }

  const create = () =>
    openModal({
      kicker: 'New assignment',
      title: 'Create an assignment',
      sub: 'Published to the section immediately and pushed as a notification.',
      fields: [
        { key: 'title', label: 'Title', kind: 'text', placeholder: 'e.g. TCP congestion control study', span: 2 },
        { key: 'subjectId', label: 'Subject', kind: 'select', options: subjects.map((s) => ({ value: s.id, label: `${s.code} · ${s.shortName}` })) },
        { key: 'dueDate', label: 'Due date', kind: 'date', value: new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10) },
        { key: 'maxMarks', label: 'Maximum marks', kind: 'number', value: '20' },
        { key: 'brief', label: 'Brief', kind: 'area', placeholder: 'What students have to do', span: 2 },
      ],
      confirmLabel: 'Publish',
      onConfirm: async (form) => {
        const result = await post<{ notified: number }>('/api/assignments', {
          title: form.title,
          subjectId: form.subjectId,
          dueDate: form.dueDate,
          maxMarks: Number(form.maxMarks || 20),
          brief: form.brief ?? '',
        });
        closeModal();
        toast(`Assignment published to ${result.notified} students.`);
        await load();
      },
    });

  const totalToGrade = data.assignments.reduce((sum, a) => sum + (a.submitted - a.graded), 0);
  const overallAverage = (() => {
    const scored = data.assignments.filter((a) => a.averageScore !== null);
    if (!scored.length) return '—';
    return (scored.reduce((s, a) => s + (a.averageScore ?? 0), 0) / scored.length).toFixed(1);
  })();

  return (
    <>
      <PageHeader
        kicker="Coursework"
        title="Assignments"
        sub="Everything you have set this semester, with live submission counts."
        actions={[{ label: 'Create assignment', icon: ICONS.plus, onClick: create, primary: true }]}
      />
      <KpiCards
        kpis={[
          { label: 'Open', value: String(data.assignments.filter((a) => a.submitted < a.total).length), sub: 'Accepting submissions', icon: ICONS.file, tone: 'var(--color-accent)', bar: '50%' },
          { label: 'To grade', value: String(totalToGrade), sub: 'Submitted, not yet marked', icon: ICONS.chart, tone: totalToGrade ? 'var(--status-warn)' : 'var(--status-ok)', bar: '66%' },
          {
            label: 'Avg. submission',
            value: data.assignments.length ? `${Math.round((data.assignments.reduce((s, a) => s + (a.total ? a.submitted / a.total : 0), 0) / data.assignments.length) * 100)}%` : '—',
            sub: `Across ${data.assignments.length} assignments`,
            icon: ICONS.att,
            tone: 'var(--status-ok)',
            bar: '78%',
          },
          { label: 'Avg. score', value: overallAverage === '—' ? '—' : `${overallAverage} / 20`, sub: 'Graded work', icon: ICONS.cap, tone: 'var(--color-accent)', bar: '87%' },
        ]}
      />
      <DataTable
        title="Assignments set"
        sub="Current semester"
        columns={[{ label: 'Assignment' }, { label: 'Due' }, { label: 'Submitted', width: '190px' }, { label: 'Count', align: 'right' }, { label: 'Status' }, { label: '', align: 'right', width: '140px' }]}
        rows={data.assignments.map((a) => ({
          key: a.id,
          cells: [
            <TwoLine key="n" top={a.title} bottom={`${a.subject.code} · ${a.subject.shortName}`} />,
            shortDate(a.dueDate),
            <Bar key="b" value={a.total ? Math.round((a.submitted / a.total) * 100) : 0} />,
            `${a.submitted} / ${a.total}`,
            <Tag key="t" kind={a.graded === a.total && a.total > 0 ? 'tag-accent' : 'tag-neutral'}>
              {a.graded === a.total && a.total > 0 ? 'Graded' : a.submitted === a.total ? 'Closed' : 'Open'}
            </Tag>,
            <button
              key="s"
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: 11.5, padding: '3px 9px' }}
              onClick={() =>
                openModal({
                  kicker: a.subject.code,
                  title: a.title,
                  sub: `${a.submitted} of ${a.total} submissions received`,
                  rows: a.submissions.slice(0, 8).map((s) => ({ k: s.name, v: s.status === 'PENDING' ? 'Not submitted' : s.score !== null ? `${s.score} / ${a.maxMarks}` : 'Submitted' })),
                  note: 'Grading closes seven days after the due date.',
                  cancelLabel: 'Close',
                })
              }
            >
              Submissions
            </button>,
          ],
        }))}
        note="Students receive a reminder 24 hours before the deadline automatically."
      />
    </>
  );
};
