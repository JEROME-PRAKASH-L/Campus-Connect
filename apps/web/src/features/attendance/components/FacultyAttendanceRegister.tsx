'use client';

import { useCallback, useEffect, useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { PageHeader, PageState } from '@/components/PageHeader';
import { Bar, Section } from '@/components/primitives';
import { useShell } from '@/components/AppShell';
import { attendanceTone } from '@/lib/format';
import { ICONS } from '@/lib/icons';
import {
  fetchAttendanceOverview,
  fetchAttendanceRegister,
  fetchRecentAttendanceSessions,
  saveAttendanceRegister,
} from '../api';
import { ATTENDANCE_MARK_OPTIONS } from '../constants';
import type {
  AttendanceMark,
  AttendanceRegister,
  AttendanceSession,
  FacultyAttendanceView,
} from '../types';

export const FacultyAttendanceRegister = () => {
  const { toast, go } = useShell();
  const [subjects, setSubjects] = useState<FacultyAttendanceView['subjects']>([]);
  const [subjectId, setSubjectId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [register, setRegister] = useState<AttendanceRegister | null>(null);
  const [marks, setMarks] = useState<Record<string, AttendanceMark>>({});
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAttendanceOverview<FacultyAttendanceView>()
      .then((data) => {
        setSubjects(data.subjects);
        setSubjectId((current) => current || data.subjects[0]?.id || '');
      })
      .catch((requestError) =>
        setError(requestError instanceof Error ? requestError.message : 'Could not load your subjects.'),
      );
    fetchRecentAttendanceSessions()
      .then((data) => setSessions(data.sessions))
      .catch(() => setSessions([]));
  }, []);

  const loadRegister = useCallback(async () => {
    if (!subjectId) return;
    const data = await fetchAttendanceRegister(subjectId, date);
    setRegister(data);
    setMarks(
      Object.fromEntries(data.students.map((student) => [student.id, student.mark ?? 'PRESENT'])) as Record<
        string,
        AttendanceMark
      >,
    );
  }, [subjectId, date]);

  useEffect(() => {
    loadRegister().catch((requestError) =>
      setError(requestError instanceof Error ? requestError.message : 'Could not load the register.'),
    );
  }, [loadRegister]);

  if (error) return <PageState>{error}</PageState>;
  if (!register) return <PageState>Loading the register…</PageState>;

  const tally = ATTENDANCE_MARK_OPTIONS.map((option) => ({
    ...option,
    count: Object.values(marks).filter((mark) => mark === option.key).length,
  }));
  const sessionPercentage = register.students.length
    ? Math.round(
        (Object.values(marks).filter((mark) => mark === 'PRESENT' || mark === 'ON_DUTY').length /
          register.students.length) *
          100,
      )
    : 0;

  const save = async () => {
    setSaving(true);
    try {
      const result = await saveAttendanceRegister(subjectId, date, marks);
      const tallyResult = result.tally;
      toast(
        `Saved · ${register.subject.code} · ${tallyResult.PRESENT ?? 0} present, ${tallyResult.ABSENT ?? 0} absent, ${tallyResult.ON_DUTY ?? 0} OD, ${tallyResult.LEAVE ?? 0} leave.`,
      );
      await loadRegister();
      const refreshed = await fetchRecentAttendanceSessions();
      setSessions(refreshed.sessions);
    } catch (requestError) {
      toast(requestError instanceof Error ? requestError.message : 'Could not save the register.');
    }
    setSaving(false);
  };

  const setAll = (mark: AttendanceMark) =>
    setMarks(
      Object.fromEntries(register.students.map((student) => [student.id, mark])) as Record<
        string,
        AttendanceMark
      >,
    );

  return (
    <>
      <PageHeader
        kicker="Attendance register"
        title="Take attendance"
        sub="Select the class, mark each student, then save. Percentages recalculate across the portal immediately."
        actions={[
          {
            label: 'Shortage report',
            icon: ICONS.chart,
            onClick: () => go('reports'),
            primary: true,
          },
        ]}
      />

      <Section style={{ gap: 'var(--space-4)' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(148px,1fr))',
            gap: 'var(--space-3)',
          }}
        >
          <div className="field">
            <label htmlFor="mk-subject">Subject</label>
            <select
              id="mk-subject"
              className="input"
              value={subjectId}
              onChange={(event) => setSubjectId(event.target.value)}
            >
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.code} · {subject.shortName}
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
            <input
              id="mk-date"
              className="input"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-3)',
            flexWrap: 'wrap',
            borderTop: '1px solid var(--color-divider)',
            borderBottom: '1px solid var(--color-divider)',
            padding: '10px 0',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-4)',
              flexWrap: 'wrap',
            }}
          >
            {tally.map((item) => (
              <div key={item.key} style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 700,
                    fontSize: 20,
                    color: item.tone,
                  }}
                >
                  {item.count}
                </span>
                <span className="eyebrow" style={{ whiteSpace: 'nowrap' }}>
                  {item.label}
                </span>
              </div>
            ))}
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 6,
                paddingLeft: 'var(--space-3)',
                borderLeft: '1px solid var(--color-divider)',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 700,
                  fontSize: 20,
                  color: 'var(--color-accent)',
                }}
              >
                {sessionPercentage}%
              </span>
              <span className="eyebrow" style={{ whiteSpace: 'nowrap' }}>
                Session %
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: 12.5 }}
              onClick={() => setAll('PRESENT')}
            >
              Mark all present
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: 12.5 }}
              onClick={() => void loadRegister()}
            >
              Reset
            </button>
            <button
              type="button"
              className="btn btn-primary"
              style={{ fontSize: 12.5 }}
              onClick={save}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save attendance'}
            </button>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 5,
            maxHeight: 520,
            overflowY: 'auto',
            paddingRight: 2,
          }}
        >
          {register.students.map((student, index) => {
            const current = marks[student.id] ?? 'PRESENT';
            const option = ATTENDANCE_MARK_OPTIONS.find((item) => item.key === current)!;

            return (
              <div
                key={student.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '7px 9px',
                  borderRadius: 10,
                  border: `1px solid ${current === 'PRESENT' ? 'var(--color-divider)' : option.tone}`,
                  background:
                    current === 'PRESENT'
                      ? 'transparent'
                      : `color-mix(in srgb, ${option.tone} 9%, transparent)`,
                }}
              >
                <span
                  style={{
                    width: 26,
                    fontSize: 11,
                    opacity: 0.62,
                    fontFamily: 'var(--font-heading)',
                  }}
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span
                  style={{
                    width: 30,
                    height: 30,
                    flex: 'none',
                    display: 'grid',
                    placeItems: 'center',
                    border: '1px solid var(--color-divider)',
                    borderRadius: 8,
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 700,
                    fontSize: 11.5,
                    color: 'var(--color-accent)',
                  }}
                >
                  {student.name
                    .split(' ')
                    .map((part) => part[0])
                    .join('')}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13.5 }}>{student.name}</span>
                  <span style={{ display: 'block', fontSize: 11, opacity: 0.72 }}>
                    {student.registerNumber} · {student.cumulative}% cumulative
                  </span>
                </span>
                {student.cumulative < 75 ? (
                  <span
                    style={{
                      fontSize: 11,
                      color: 'var(--status-bad)',
                      width: 96,
                      textAlign: 'right',
                    }}
                  >
                    Shortage
                  </span>
                ) : (
                  <span style={{ width: 96 }} />
                )}
                <span
                  style={{
                    display: 'flex',
                    border: '1px solid var(--color-divider)',
                    borderRadius: 8,
                    overflow: 'hidden',
                  }}
                >
                  {ATTENDANCE_MARK_OPTIONS.map((markOption, markIndex) => (
                    <button
                      key={markOption.key}
                      type="button"
                      title={markOption.label}
                      aria-label={`${student.name}: ${markOption.label}`}
                      aria-pressed={current === markOption.key}
                      onClick={() =>
                        setMarks((previous) => ({ ...previous, [student.id]: markOption.key }))
                      }
                      style={{
                        width: 36,
                        height: 31,
                        border: 0,
                        borderLeft: markIndex === 0 ? 0 : '1px solid var(--color-divider)',
                        cursor: 'pointer',
                        background: current === markOption.key ? markOption.tone : 'transparent',
                        color: current === markOption.key ? '#fff' : 'var(--color-text)',
                        fontFamily: 'var(--font-heading)',
                        fontWeight: 700,
                        fontSize: 12.5,
                        transition: 'background .14s',
                      }}
                    >
                      {markOption.short}
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
        columns={[
          { label: 'Date' },
          { label: 'Subject' },
          { label: 'Marked', width: '190px' },
        ]}
        rows={sessions.map((session, index) => ({
          key: `${session.date}-${session.code}-${index}`,
          cells: [
            new Date(session.date).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            }),
            session.code,
            <Bar
              key="bar"
              value={session.percentage}
              tone={attendanceTone(session.percentage)}
            />,
          ],
        }))}
        note="Registers stay editable for 48 hours; after that a correction has to be countersigned by the HOD."
        emptyLabel="No registers saved yet."
      />
    </>
  );
};
