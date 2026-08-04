'use client';

import { useEffect, useState } from 'react';
import { api, post } from '@/lib/api';
import { ICONS } from '@/lib/icons';
import { shortDate } from '@/lib/format';
import { useShell } from '@/components/AppShell';
import { PageHeader, PageState } from '@/components/PageHeader';
import { KpiCards, Select, Tag } from '@/components/primitives';
import { CardGrid } from '@/components/blocks';

type MaterialsData = {
  materials: { id: string; title: string; kind: string; size: string; downloads: number; uploadedBy: string; uploadedOn: string; subject: { id: string; code: string; shortName: string } }[];
  subjects: { id: string; code: string; shortName: string }[];
};

export const Materials = () => {
  const { user, toast, openModal, closeModal } = useShell();
  const [data, setData] = useState<MaterialsData | null>(null);
  const [filter, setFilter] = useState('All subjects');
  const [error, setError] = useState('');

  const load = () =>
    api<MaterialsData>('/api/materials')
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load materials.'));

  useEffect(() => {
    void load();
  }, []);

  if (error) return <PageState>{error}</PageState>;
  if (!data) return <PageState>Loading materials…</PageState>;

  const canUpload = user.role === 'FACULTY' || user.role === 'HOD' || user.role === 'ADMIN';
  const options = ['All subjects', ...data.subjects.map((s) => s.code)];
  const visible = data.materials.filter((m) => filter === 'All subjects' || m.subject.code === filter);
  const recent = data.materials.filter((m) => Date.now() - +new Date(m.uploadedOn) < 7 * 86_400_000).length;

  const upload = () =>
    openModal({
      kicker: 'Study material',
      title: 'Upload material',
      sub: 'Visible to every student taking the subject.',
      fields: [
        { key: 'title', label: 'Title', kind: 'text', placeholder: 'e.g. Unit IV — Transport layer', span: 2 },
        { key: 'subjectId', label: 'Subject', kind: 'select', options: data.subjects.map((s) => ({ value: s.id, label: `${s.code} · ${s.shortName}` })) },
        { key: 'kind', label: 'Type', kind: 'select', options: ['PDF', 'PPTX', 'DOCX', 'VIDEO'].map((k) => ({ value: k, label: k })) },
        { key: 'file', label: 'File', kind: 'file', value: 'Drop a file here (max 50 MB)', span: 2 },
      ],
      confirmLabel: 'Publish',
      onConfirm: async (form) => {
        const result = await post<{ notified: number }>('/api/materials', { title: form.title, subjectId: form.subjectId, kind: form.kind });
        closeModal();
        toast(`Material published to ${result.notified} students.`);
        await load();
      },
    });

  const download = async (id: string, title: string) => {
    await post(`/api/materials/${id}/download`);
    toast(`Downloading “${title}”…`);
    await load();
  };

  return (
    <>
      <PageHeader
        kicker="Study materials"
        title="Materials"
        sub="Notes, slide decks and handouts published by faculty for the current semester."
        actions={canUpload ? [{ label: 'Upload material', icon: ICONS.plus, onClick: upload, primary: true }] : [{ label: 'Request notes', icon: ICONS.send, onClick: () => toast('Request sent to the subject faculty.') }]}
      />
      <KpiCards
        kpis={[
          { label: 'Files', value: String(data.materials.length), sub: `Across ${new Set(data.materials.map((m) => m.subject.code)).size} subjects`, icon: ICONS.file, tone: 'var(--color-accent)', bar: '60%' },
          { label: 'Added this week', value: String(recent), sub: 'Newly published', icon: ICONS.clock, tone: 'var(--status-ok)', bar: '40%' },
          { label: 'Downloads', value: data.materials.reduce((s, m) => s + m.downloads, 0).toLocaleString('en-IN'), sub: 'All material', icon: ICONS.down, tone: 'var(--color-accent)', bar: '80%' },
          { label: 'Subjects', value: String(data.subjects.length), sub: 'Publishing material', icon: ICONS.book, tone: 'var(--color-accent)', bar: '70%' },
        ]}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Select value={filter} options={options} onChange={setFilter} />
      </div>
      <CardGrid>
        {visible.map((m) => (
          <div key={m.id} className="card anim-fade-up" style={{ padding: 20, paddingTop: 22, gap: 'var(--space-2)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
              <span className="card-kicker">
                {m.subject.code} · {m.subject.shortName}
              </span>
              <Tag kind="tag-accent">{m.kind}</Tag>
            </div>
            <div className="card-title">{m.title}</div>
            <p className="card-body">
              Uploaded by {m.uploadedBy} on {shortDate(m.uploadedOn)}. {m.size}.
            </p>
            <div style={{ marginTop: 2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, opacity: 0.72, marginBottom: 4 }}>
                <span>Downloads</span>
                <span>{m.downloads}</span>
              </div>
              <div style={{ height: 5, background: 'var(--color-divider)' }}>
                <div className="anim-grow" style={{ height: 5, width: `${Math.min(m.downloads / 3, 100)}%`, background: 'var(--color-accent)' }} />
              </div>
            </div>
            <div className="card-meta" style={{ justifyContent: 'space-between', borderTop: '1px solid var(--color-divider)', paddingTop: 9, marginTop: 3, gap: 8, flexWrap: 'wrap' }}>
              <span>
                {m.kind} · {m.size}
              </span>
              <button type="button" className="btn btn-primary" style={{ fontSize: 11.5, padding: '4px 10px' }} onClick={() => void download(m.id, m.title)}>
                Download
              </button>
            </div>
          </div>
        ))}
      </CardGrid>
    </>
  );
};
