'use client';

import { useEffect, useState } from 'react';
import { api, post } from '@/lib/api';
import { ICONS } from '@/lib/icons';
import { attendanceTone } from '@/lib/format';
import { useShell } from '@/components/AppShell';
import { PageHeader, PageState } from '@/components/PageHeader';
import { Bar, Chips, KpiCards, Select, Tag } from '@/components/primitives';
import { DataTable, Figure, TwoLine } from '@/components/DataTable';

type Student = { id: string; name: string; registerNumber: string; section: string; attendance: number; cgpa: number; fees: string; mentor: string; guardianMobile: string };
type Faculty = { id: string; name: string; staffId: string; designation: string; department: string; subjects: string; hours: number; sections: number; experience: number; load: string };
type Summary = { students: number; faculty: number; departments: number; institutionalStudents: number; institutionalFaculty: number; belowThreshold: number; feeDefaulters: number };
type Application = { name: string; programme: string; score: string; status: string; reference: string };

export const People = () => {
  const { user, toast, openModal, closeModal } = useShell();
  const [tab, setTab] = useState('Students');
  const [section, setSection] = useState('All sections');
  const [students, setStudents] = useState<Student[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [error, setError] = useState('');

  const isAdmin = user.role === 'ADMIN';
  const tabs = isAdmin ? ['Students', 'Faculty', 'Admissions'] : ['Students', 'Faculty'];

  useEffect(() => {
    Promise.all([
      api<{ students: Student[] }>(`/api/people/students?section=${encodeURIComponent(section)}`).then((d) => setStudents(d.students)),
      api<{ faculty: Faculty[] }>('/api/people/faculty').then((d) => setFaculty(d.faculty)),
      api<Summary>('/api/people/summary').then(setSummary),
      isAdmin ? api<{ applications: Application[] }>('/api/people/admissions').then((d) => setApplications(d.applications)) : Promise.resolve(),
    ]).catch((e) => setError(e instanceof Error ? e.message : 'Could not load the directory.'));
  }, [section, isAdmin]);

  if (error) return <PageState>{error}</PageState>;
  if (!summary) return <PageState>Loading the directory…</PageState>;

  const addRecord = () =>
    openModal({
      kicker: 'Registry',
      title: 'Add a new record',
      sub: 'Creates a user account and issues credentials by email.',
      fields: [
        { key: 'name', label: 'Full name', kind: 'text', placeholder: 'e.g. Nandita Rao' },
        { key: 'role', label: 'Role', kind: 'select', options: ['STUDENT', 'FACULTY', 'HOD', 'PARENT', 'ADMIN'].map((r) => ({ value: r, label: r.charAt(0) + r.slice(1).toLowerCase() })) },
        { key: 'departmentCode', label: 'Department', kind: 'select', options: ['CSE', 'ECE', 'MECH', 'IT', 'CIVIL', 'MBA'].map((d) => ({ value: d, label: d })) },
        { key: 'email', label: 'Email', kind: 'text', placeholder: 'name@dmice.edu.in' },
      ],
      confirmLabel: 'Create account',
      onConfirm: async (form) => {
        const result = await post<{ loginId: string }>('/api/people', form);
        closeModal();
        toast(`${form.name} created · login ID ${result.loginId}, credentials emailed.`);
      },
    });

  const table = (() => {
    if (tab === 'Faculty') {
      return {
        title: 'Faculty',
        sub: 'Teaching staff and allocation',
        columns: [{ label: 'Faculty' }, { label: 'Designation' }, { label: 'Subjects' }, { label: 'Hours / week', align: 'right' as const }, { label: 'Sections', align: 'right' as const }, { label: 'Load' }, { label: '', align: 'right' as const, width: '120px' }],
        rows: faculty.map((f) => ({
          key: f.id,
          cells: [
            <TwoLine key="n" top={f.name} bottom={f.staffId} />,
            f.designation,
            f.subjects,
            <Figure key="h">{f.hours}</Figure>,
            String(f.sections),
            <Tag key="l" kind={f.load === 'Heavy' ? 'tag-neutral' : 'tag-accent'}>
              {f.load}
            </Tag>,
            <button
              key="b"
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: 11.5, padding: '3px 9px' }}
              onClick={() =>
                openModal({
                  kicker: 'Faculty workload',
                  title: f.name,
                  sub: `${f.designation} · ${f.department} · ${f.experience} years`,
                  rows: [
                    { k: 'Subjects', v: f.subjects },
                    { k: 'Contact hours', v: `${f.hours} / week` },
                    { k: 'Sections', v: String(f.sections) },
                    { k: 'Load status', v: f.load },
                    { k: 'Staff ID', v: f.staffId },
                  ],
                  note: f.load === 'Heavy' ? 'Above the 18 hour guideline — consider reallocating one section.' : 'Within the departmental workload guideline.',
                  cancelLabel: 'Close',
                })
              }
            >
              Workload
            </button>,
          ],
        })),
        note: 'Departmental guideline is 14–18 contact hours per week.',
        controls: null,
      };
    }
    if (tab === 'Admissions') {
      return {
        title: 'Admissions',
        sub: 'Current admission pipeline',
        columns: [{ label: 'Applicant' }, { label: 'Programme' }, { label: 'Entrance score' }, { label: 'Status' }, { label: '', align: 'right' as const, width: '170px' }],
        rows: applications.map((a) => ({
          key: a.reference,
          cells: [
            <TwoLine key="n" top={a.name} bottom={a.reference} />,
            a.programme,
            <Figure key="s">{a.score}</Figure>,
            <Tag key="t" kind={a.status === 'Verified' ? 'tag-accent' : 'tag-neutral'}>
              {a.status}
            </Tag>,
            <span key="b" style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-primary" style={{ fontSize: 11.5, padding: '3px 9px' }} onClick={() => toast(`${a.name} admitted to ${a.programme}. Register number allotted.`)}>
                Admit
              </button>
              <button type="button" className="btn btn-secondary" style={{ fontSize: 11.5, padding: '3px 9px' }} onClick={() => toast(`${a.name} moved to the hold list.`)}>
                Hold
              </button>
            </span>,
          ],
        })),
        note: 'Applications are verified against the entrance score and submitted documents.',
        controls: null,
      };
    }
    return {
      title: 'Students',
      sub: 'Enrolled students for the current semester',
      columns: [{ label: 'Student' }, { label: 'Section' }, { label: 'Attendance', width: '200px' }, { label: 'CGPA' }, { label: 'Fees' }, { label: '', align: 'right' as const, width: '110px' }],
      rows: students.map((s) => ({
        key: s.id,
        cells: [
          <TwoLine key="n" top={s.name} bottom={s.registerNumber} />,
          s.section,
          <Bar key="b" value={s.attendance} tone={attendanceTone(s.attendance)} />,
          <Figure key="c">{s.cgpa.toFixed(2)}</Figure>,
          <Tag key="f" kind={s.fees === 'Cleared' ? 'tag-accent' : 'tag-neutral'}>
            {s.fees}
          </Tag>,
          <button
            key="o"
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: 11.5, padding: '3px 9px' }}
            onClick={() =>
              openModal({
                kicker: 'Student record',
                title: s.name,
                sub: `${s.registerNumber} · ${s.section}`,
                rows: [
                  { k: 'Attendance', v: `${s.attendance}%` },
                  { k: 'CGPA', v: s.cgpa.toFixed(2) },
                  { k: 'Fees', v: s.fees },
                  { k: 'Mentor', v: s.mentor },
                  { k: 'Contact', v: s.guardianMobile },
                ],
                note: s.attendance < 75 ? 'Attendance is below the 75% requirement — a shortage notice has been issued.' : 'No academic flags on this record.',
                cancelLabel: 'Close',
              })
            }
          >
            Open
          </button>,
        ],
      })),
      note: `${students.length} students · ${students.filter((s) => s.attendance < 75).length} below the 75% attendance requirement.`,
      controls: <Select value={section} options={['All sections', 'Section A', 'Section B', 'Section C']} onChange={setSection} />,
    };
  })();

  return (
    <>
      <PageHeader
        kicker={isAdmin ? 'Institute directory' : 'Department directory'}
        title="People"
        sub="Students, faculty and admissions in one directory. Search from the top bar to jump to a record."
        actions={[
          { label: 'Export CSV', icon: ICONS.down, onClick: () => toast('Directory exported as CSV.') },
          ...(isAdmin ? [{ label: 'Add record', icon: ICONS.plus, onClick: addRecord, primary: true }] : []),
        ]}
      />
      <KpiCards
        kpis={[
          { label: 'Students', value: summary.institutionalStudents.toLocaleString('en-IN'), sub: `${summary.departments} departments`, icon: ICONS.users, tone: 'var(--color-accent)', bar: '86%' },
          { label: 'Faculty', value: String(summary.institutionalFaculty), sub: 'Teaching staff on roll', icon: ICONS.users, tone: 'var(--color-accent)', bar: '58%' },
          { label: 'Below 75%', value: String(summary.belowThreshold), sub: 'Attendance shortage notices', icon: ICONS.att, tone: summary.belowThreshold ? 'var(--status-bad)' : 'var(--status-ok)', bar: '12%' },
          { label: 'Fee defaulters', value: String(summary.feeDefaulters), sub: 'Pending beyond due date', icon: ICONS.card, tone: summary.feeDefaulters ? 'var(--status-warn)' : 'var(--status-ok)', bar: '24%' },
        ]}
      />
      <DataTable
        title={table.title}
        sub={table.sub}
        columns={table.columns}
        rows={table.rows}
        note={table.note}
        controls={
          <>
            <Chips options={tabs} value={tab} onChange={setTab} />
            {table.controls}
          </>
        }
      />
    </>
  );
};
