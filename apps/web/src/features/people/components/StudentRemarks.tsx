'use client';

import { useCallback, useEffect, useState } from 'react';
import { studentRemarkCreateSchema } from '@campus-connect/contracts';
import { EmptyState, Spinner, SuccessBanner } from '@campus-connect/ui';
import { ErrorState } from '@/components/feedback';
import { ResourceForm, type FieldSpec } from '@/components/forms/ResourceForm';
import { DataTable, TwoLine } from '@/components/tables/DataTable';
import { Section, SectionHead, Tag } from '@/components/ui/primitives';
import { api, messageFrom, post } from '@/lib/api';
import { relativeTime } from '@/lib/utilities/format';
import { useFormOptions } from '@/hooks/useFormOptions';
import { useShell } from '@/components/layout/AppShell';

type Remark = { id: string; category: string; body: string; createdAt: string; student: string; registerNumber: string; subject: string | null; author: string };

const CATEGORIES = [
  { value: 'ACADEMIC', label: 'Academic' },
  { value: 'BEHAVIOUR', label: 'Behaviour' },
  { value: 'ATTENDANCE', label: 'Attendance' },
  { value: 'COMMENDATION', label: 'Commendation' },
];

const TONE: Record<string, string> = { COMMENDATION: 'tag-ok', BEHAVIOUR: 'tag-warn', ATTENDANCE: 'tag-warn' };

/** Faculty notes against a student, optionally tied to a subject they teach. */
export const StudentRemarks = () => {
  const { toast } = useShell();
  const { options } = useFormOptions();
  const [remarks, setRemarks] = useState<Remark[] | null>(null);
  const [error, setError] = useState('');
  const [banner, setBanner] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await api<{ remarks: Remark[] }>('/api/remarks');
      setRemarks(data.remarks);
      setError('');
    } catch (e) {
      setError(messageFrom(e, 'Could not load student remarks.'));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const fields: FieldSpec[] = [
    { key: 'studentId', label: 'Student', kind: 'select', required: true, options: options.students, span: 2 },
    { key: 'subjectId', label: 'Subject', kind: 'select', options: options.subjects },
    { key: 'category', label: 'Category', kind: 'select', required: true, options: CATEGORIES },
    { key: 'body', label: 'Remark', kind: 'textarea', required: true, span: 2 },
  ];

  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!remarks) return <Spinner label="Loading remarks…" />;

  return (
    <>
      {banner ? <SuccessBanner message={banner} onDismiss={() => setBanner('')} /> : null}

      <Section>
        <SectionHead title="Record a remark" meta="Visible to the student and their guardian" />
        <ResourceForm
          fields={fields}
          schema={studentRemarkCreateSchema}
          submitLabel="Save remark"
          onSubmit={async (values) => {
            await post('/api/remarks', values);
            setBanner('Remark saved to the student record.');
            toast('Remark saved.');
            await load();
          }}
        />
      </Section>

      {remarks.length === 0 ? (
        <Section>
          <EmptyState title="No remarks yet" body="Notes you record against a student appear here and on their profile." />
        </Section>
      ) : (
        <DataTable
          title="Recent remarks"
          sub={`${remarks.length} on record`}
          columns={[{ label: 'Student' }, { label: 'Category' }, { label: 'Remark' }, { label: 'Subject' }, { label: 'By' }, { label: 'When' }]}
          rows={remarks.slice(0, 25).map((r) => ({
            key: r.id,
            cells: [
              <TwoLine key="s" top={r.student} bottom={r.registerNumber} />,
              <Tag key="c" kind={TONE[r.category] ?? 'tag-accent'}>
                {r.category}
              </Tag>,
              r.body,
              r.subject ?? '—',
              r.author,
              relativeTime(r.createdAt),
            ],
          }))}
          note="Remarks are part of the student's permanent record and are written to the audit trail."
        />
      )}
    </>
  );
};
