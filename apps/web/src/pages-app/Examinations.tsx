'use client';

import { useEffect, useState } from 'react';
import { api, post } from '@/lib/api';
import { ICONS } from '@/lib/icons';
import { dayName, shortDate } from '@/lib/format';
import { useShell } from '@/components/AppShell';
import { PageHeader, PageState } from '@/components/PageHeader';
import { KpiCards } from '@/components/primitives';
import { DataTable, Figure, TwoLine } from '@/components/DataTable';

type ExamData = {
  scope: 'student' | 'staff';
  exams: { id: string; title: string; code: string; name: string; subjectId: string; date: string; session: string; hall: string; seatNo: string; strength: number }[];
  candidate: { name: string; registerNumber: string } | null;
  arrears: number;
};

export const Examinations = () => {
  const { toast, openModal, closeModal } = useShell();
  const [data, setData] = useState<ExamData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<ExamData>('/api/examinations')
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load the examination schedule.'));
  }, []);

  if (error) return <PageState>{error}</PageState>;
  if (!data) return <PageState>Loading examinations…</PageState>;

  const staff = data.scope === 'staff';
  const upcoming = data.exams.filter((e) => new Date(e.date) >= new Date());
  const first = [...data.exams].sort((a, b) => +new Date(a.date) - +new Date(b.date))[0];
  const daysToFirst = first ? Math.max(0, Math.ceil((+new Date(first.date) - Date.now()) / 86_400_000)) : 0;

  const enterMarks = async (exam: ExamData['exams'][number]) => {
    const roster = await api<{ students: { id: string; name: string; registerNumber: string; semesterExam: number | null }[] }>(`/api/examinations/${exam.subjectId}/marks`);
    openModal({
      kicker: `${exam.code} · mark entry`,
      title: `Enter marks — ${exam.name}`,
      sub: 'Semester examination · maximum 100',
      fields: roster.students.map((s) => ({
        key: s.id,
        label: `${s.name} · ${s.registerNumber}`,
        kind: 'number' as const,
        value: s.semesterExam !== null ? String(s.semesterExam) : '',
        placeholder: '—',
      })),
      note: `Showing ${roster.students.length} candidates. Marks are locked once the controller of examinations publishes the result.`,
      confirmLabel: 'Save marks',
      onConfirm: async (form) => {
        const marks = Object.entries(form)
          .filter(([, v]) => v !== '')
          .map(([studentId, v]) => ({ studentId, semesterExam: Number(v) }));
        if (!marks.length) throw new Error('Enter at least one mark.');
        const result = await post<{ updated: number }>(`/api/examinations/${exam.subjectId}/marks`, { marks });
        closeModal();
        toast(`Marks saved for ${exam.code} · ${result.updated} candidates updated.`);
      },
    });
  };

  const hallTicket = (exam: ExamData['exams'][number]) =>
    openModal({
      kicker: 'Hall ticket',
      title: exam.name,
      sub: `${exam.code} · ${exam.title}`,
      rows: [
        { k: 'Candidate', v: data.candidate ? `${data.candidate.name} · ${data.candidate.registerNumber}` : '—' },
        { k: 'Date', v: `${shortDate(exam.date)} · ${dayName(exam.date)}` },
        { k: 'Reporting', v: '09:00' },
        { k: 'Session', v: exam.session },
        { k: 'Hall', v: exam.hall },
        { k: 'Seat', v: exam.seatNo },
      ],
      note: 'Carry your institute identity card. Programmable calculators are not permitted.',
      cancelLabel: 'Close',
      confirmLabel: 'Download PDF',
      onConfirm: () => {
        closeModal();
        toast('Hall ticket downloaded.');
      },
    });

  return (
    <>
      <PageHeader
        kicker={first ? `${first.title} · ${new Date(first.date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}` : 'Examinations'}
        title="Examinations"
        sub={staff ? 'Examination schedule, invigilation and mark entry for the current assessment cycle.' : 'Your examination schedule, hall allotment and seat numbers.'}
        actions={
          staff
            ? [{ label: 'Publish timetable', icon: ICONS.send, onClick: () => toast('Examination timetable published to all candidates.') }]
            : [{ label: 'Download timetable', icon: ICONS.down, onClick: () => toast('Examination timetable downloaded.') }]
        }
      />
      <KpiCards
        kpis={[
          { label: 'Papers', value: String(data.exams.length), sub: first ? `From ${shortDate(first.date)}` : 'None scheduled', icon: ICONS.cap, tone: 'var(--color-accent)', bar: '60%' },
          { label: 'Days to first paper', value: String(daysToFirst), sub: first ? `${first.code} · ${shortDate(first.date)}` : '—', icon: ICONS.clock, tone: daysToFirst <= 7 ? 'var(--status-warn)' : 'var(--color-accent)', bar: '35%' },
          { label: staff ? 'Candidates' : 'Hall', value: staff ? String(first?.strength ?? 0) : (first?.hall ?? '—'), sub: staff ? 'Per paper' : 'Allotted hall', icon: ICONS.users, tone: 'var(--color-accent)', bar: '62%' },
          { label: staff ? 'Upcoming' : 'Arrears', value: staff ? String(upcoming.length) : String(data.arrears), sub: staff ? 'Still to be held' : data.arrears ? 'Pending papers' : 'No pending papers', icon: ICONS.file, tone: staff ? 'var(--color-accent)' : data.arrears ? 'var(--status-bad)' : 'var(--status-ok)', bar: '20%' },
        ]}
      />
      <DataTable
        title="Examination timetable"
        sub={first?.title ?? 'Current assessment cycle'}
        columns={[{ label: 'Paper' }, { label: 'Date' }, { label: 'Session' }, { label: 'Hall' }, { label: staff ? 'Strength' : 'Seat' }, { label: '', align: 'right', width: '150px' }]}
        rows={data.exams.map((e) => ({
          key: e.id,
          cells: [
            <TwoLine key="n" top={e.name} bottom={e.code} />,
            `${shortDate(e.date)} · ${dayName(e.date)}`,
            e.session,
            e.hall,
            staff ? `${e.strength} candidates` : <Figure key="s">{e.seatNo}</Figure>,
            staff ? (
              <button key="b" type="button" className="btn btn-primary" style={{ fontSize: 11.5, padding: '3px 9px' }} onClick={() => void enterMarks(e)}>
                Enter marks
              </button>
            ) : (
              <button key="b" type="button" className="btn btn-secondary" style={{ fontSize: 11.5, padding: '3px 9px' }} onClick={() => hallTicket(e)}>
                Hall ticket
              </button>
            ),
          ],
        }))}
        note="Reporting time is 30 minutes before the session. Answer scripts are valued centrally."
      />
    </>
  );
};
