'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { internalMarksSchema } from '@campus-connect/contracts';
import { FormActions, SelectInput, Spinner, SuccessBanner } from '@campus-connect/ui';
import { ErrorState } from '@/components/feedback';
import { Section, SectionHead, Tag } from '@/components/ui/primitives';
import { api, messageFrom, post } from '@/lib/api';
import { validateWith } from '@/lib/validation/validate';
import { useShell } from '@/components/layout/AppShell';
import type { Option } from '@/types';

type Candidate = {
  id: string;
  name: string;
  registerNumber: string;
  internal1: number | null;
  internal2: number | null;
  assignment: number | null;
  practical: number | null;
  total: number;
  grade: string;
};

type Roster = { subject: { id: string; code: string; name: string; kind: 'THEORY' | 'PRACTICAL' }; students: Candidate[] };

const COLUMNS = [
  { key: 'internal1', label: 'IA 1', max: 50, theoryOnly: true },
  { key: 'internal2', label: 'IA 2', max: 50, theoryOnly: true },
  { key: 'assignment', label: 'Assignment', max: 20, theoryOnly: true },
  { key: 'practical', label: 'Practical', max: 50, theoryOnly: false },
] as const;

const cell = (value: number | null) => (value === null ? '' : String(value));

/**
 * Internal assessment entry for one subject.
 *
 * The subject list only contains subjects allocated to the signed-in member of
 * staff, and the API re-checks that allocation on both the read and the save —
 * the dropdown is a convenience, not the control.
 */
export const InternalMarksEditor = ({ subjects }: { subjects: Option[] }) => {
  const { toast } = useShell();
  const [subjectId, setSubjectId] = useState(subjects[0]?.value ?? '');
  const [roster, setRoster] = useState<Roster | null>(null);
  const [draft, setDraft] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState('');

  const load = useCallback(async () => {
    if (!subjectId) return;
    setLoading(true);
    setError('');
    try {
      const data = await api<Roster>(`/api/examinations/${subjectId}/internal-marks`);
      setRoster(data);
      setDraft(
        Object.fromEntries(
          data.students.map((s) => [s.id, { internal1: cell(s.internal1), internal2: cell(s.internal2), assignment: cell(s.assignment), practical: cell(s.practical) }]),
        ),
      );
    } catch (e) {
      setError(messageFrom(e, 'Could not load the mark sheet.'));
      setRoster(null);
    } finally {
      setLoading(false);
    }
  }, [subjectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns = useMemo(() => COLUMNS.filter((c) => (roster?.subject.kind === 'PRACTICAL' ? !c.theoryOnly : c.theoryOnly)), [roster]);

  const set = (studentId: string, key: string, value: string) => {
    setDraft((prev) => ({ ...prev, [studentId]: { ...prev[studentId], [key]: value } }));
    setFormError('');
  };

  const save = async () => {
    if (!roster) return;
    const marks = Object.entries(draft)
      .map(([studentId, values]) => {
        const entered = Object.fromEntries(columns.map((c) => [c.key, values[c.key]]).filter(([, v]) => v !== '' && v !== undefined));
        return Object.keys(entered).length ? { studentId, ...entered } : null;
      })
      .filter((m): m is { studentId: string } => m !== null);

    const payload = { subjectId: roster.subject.id, marks };
    const check = validateWith(internalMarksSchema, payload);
    if (!check.ok) {
      setFormError(check.message);
      return;
    }

    setSaving(true);
    try {
      const result = await post<{ updated: number }>(`/api/examinations/${roster.subject.id}/internal-marks`, payload);
      setSaved(`Internal marks saved for ${result.updated} candidate${result.updated === 1 ? '' : 's'}.`);
      toast('Internal marks saved.');
      await load();
    } catch (e) {
      setFormError(messageFrom(e));
    } finally {
      setSaving(false);
    }
  };

  if (!subjects.length) return null;

  return (
    <Section>
      <SectionHead title="Internal assessment entry" meta={roster ? `${roster.students.length} candidates` : undefined} />
      {saved ? <SuccessBanner message={saved} onDismiss={() => setSaved('')} /> : null}

      <div style={{ maxWidth: 380 }}>
        <SelectInput id="ia-subject" label="Subject" value={subjectId} onChange={setSubjectId} options={subjects} disabled={loading || saving} />
      </div>

      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {loading && !roster ? <Spinner label="Loading the mark sheet…" /> : null}

      {roster ? (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ minWidth: 640 }}>
              <thead>
                <tr>
                  <th>Candidate</th>
                  {columns.map((c) => (
                    <th key={c.key} style={{ textAlign: 'right', width: 110 }}>
                      {c.label} <span style={{ opacity: 0.6 }}>/ {c.max}</span>
                    </th>
                  ))}
                  <th style={{ textAlign: 'right', width: 90 }}>Total</th>
                  <th style={{ textAlign: 'right', width: 80 }}>Grade</th>
                </tr>
              </thead>
              <tbody>
                {roster.students.map((student) => (
                  <tr key={student.id}>
                    <td>
                      <span style={{ display: 'block', fontSize: 13.5 }}>{student.name}</span>
                      <span style={{ display: 'block', fontSize: 11.5, opacity: 0.72 }}>{student.registerNumber}</span>
                    </td>
                    {columns.map((c) => (
                      <td key={c.key} style={{ textAlign: 'right' }}>
                        <input
                          className="input figure"
                          type="number"
                          min={0}
                          max={c.max}
                          aria-label={`${c.label} for ${student.name}`}
                          value={draft[student.id]?.[c.key] ?? ''}
                          disabled={saving}
                          onChange={(e) => set(student.id, c.key, e.target.value)}
                          style={{ width: 84, textAlign: 'right', marginLeft: 'auto' }}
                        />
                      </td>
                    ))}
                    <td style={{ textAlign: 'right' }} className="figure">
                      {student.total}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Tag kind={student.grade === 'RA' ? 'tag-bad' : 'tag-accent'}>{student.grade}</Tag>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {formError ? (
            <div role="alert" style={{ border: '1px solid var(--status-bad)', borderRadius: 8, color: 'var(--status-bad)', fontSize: 12.5, padding: '8px 10px' }}>
              {formError}
            </div>
          ) : null}

          <FormActions onSubmit={() => void save()} submitLabel="Save internal marks" busy={saving} />
        </>
      ) : null}
    </Section>
  );
};
