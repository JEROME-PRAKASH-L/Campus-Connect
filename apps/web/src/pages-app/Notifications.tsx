'use client';

import { useEffect, useState } from 'react';
import { api, post } from '@/lib/api';
import { ICONS } from '@/lib/icons';
import { relativeTime, titleCase } from '@/lib/format';
import { useShell } from '@/components/AppShell';
import { PageHeader, PageState } from '@/components/PageHeader';
import { Chips, KpiCards, Tag } from '@/components/primitives';
import { DataTable, TwoLine } from '@/components/DataTable';
import type { Notification, RouteKey } from '@/lib/types';

const FILTERS = ['All', 'Attendance', 'Assignment', 'Examination', 'Fees', 'Leave', 'Announcement'];

export const Notifications = () => {
  const { user, go, toast, openModal, closeModal, refreshNotifications } = useShell();
  const [items, setItems] = useState<Notification[] | null>(null);
  const [filter, setFilter] = useState('All');
  const [error, setError] = useState('');

  const load = () =>
    api<{ notifications: Notification[] }>('/api/notifications')
      .then((d) => setItems(d.notifications))
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load notifications.'));

  useEffect(() => {
    void load();
  }, []);

  if (error) return <PageState>{error}</PageState>;
  if (!items) return <PageState>Loading notifications…</PageState>;

  const staff = user.role === 'FACULTY' || user.role === 'HOD' || user.role === 'ADMIN';
  const visible = items.filter((n) => filter === 'All' || n.kind === filter.toUpperCase() || (filter === 'Assignment' && n.kind === 'DEADLINE'));
  const unread = items.filter((n) => !n.read).length;
  const thisWeek = items.filter((n) => Date.now() - +new Date(n.createdAt) < 7 * 86_400_000).length;

  const announce = () =>
    openModal({
      kicker: 'Broadcast',
      title: 'Send an announcement',
      sub: 'Delivered to the portal, email and SMS.',
      fields: [
        { key: 'title', label: 'Title', kind: 'text', placeholder: 'e.g. Lab session rescheduled', span: 2 },
        { key: 'audience', label: 'Audience', kind: 'select', options: ['All students', 'All faculty', 'Entire institute', 'Parents'].map((a) => ({ value: a, label: a })) },
        { key: 'priority', label: 'Priority', kind: 'select', options: ['Normal', 'High', 'Urgent'].map((p) => ({ value: p, label: p })) },
        { key: 'body', label: 'Message', kind: 'area', placeholder: 'Keep it short and specific', span: 2 },
      ],
      confirmLabel: 'Send now',
      onConfirm: async (form) => {
        const result = await post<{ sent: number }>('/api/notifications/announce', form);
        closeModal();
        toast(`Announcement sent to ${result.sent} recipients.`);
        await load();
        await refreshNotifications();
      },
    });

  const markAll = async () => {
    await post('/api/notifications/read-all');
    toast('All notifications marked as read.');
    await load();
    await refreshNotifications();
  };

  return (
    <>
      <PageHeader
        kicker="Inbox"
        title="Notifications"
        sub="Attendance alerts, deadlines, results, fee reminders and institute announcements."
        actions={staff ? [{ label: 'Send announcement', icon: ICONS.send, onClick: announce, primary: true }] : [{ label: 'Mark all read', icon: ICONS.att, onClick: markAll }]}
      />
      <KpiCards
        kpis={[
          { label: 'Unread', value: String(unread), sub: 'Awaiting your attention', icon: ICONS.file, tone: unread ? 'var(--color-accent)' : 'var(--status-ok)', bar: '40%' },
          { label: 'Action needed', value: String(items.filter((n) => n.tone === 'BAD' || n.tone === 'WARN').length), sub: 'Fee & attendance alerts', icon: ICONS.att, tone: 'var(--status-warn)', bar: '20%' },
          { label: 'This week', value: String(thisWeek), sub: 'Recently delivered', icon: ICONS.clock, tone: 'var(--color-accent)', bar: '50%' },
          { label: 'Total', value: String(items.length), sub: 'On record', icon: ICONS.send, tone: 'var(--color-accent)', bar: '75%' },
        ]}
      />
      <DataTable
        title="All notifications"
        sub="Most recent first"
        controls={<Chips options={FILTERS} value={filter} onChange={setFilter} />}
        columns={[{ label: 'Notification' }, { label: 'Type' }, { label: 'When' }, { label: 'State' }, { label: '', align: 'right', width: '110px' }]}
        rows={visible.map((n) => ({
          key: n.id,
          cells: [
            <TwoLine key="n" top={n.title} bottom={n.body} />,
            <Tag key="k" kind={n.tone === 'BAD' || n.tone === 'WARN' ? 'tag-neutral' : 'tag-accent'}>
              {titleCase(n.kind)}
            </Tag>,
            relativeTime(n.createdAt),
            <Tag key="s" kind={n.read ? 'tag-neutral' : 'tag-accent'}>
              {n.read ? 'Read' : 'Unread'}
            </Tag>,
            <button
              key="o"
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: 11.5, padding: '3px 9px' }}
              onClick={async () => {
                await post(`/api/notifications/${n.id}/read`);
                await refreshNotifications();
                go(n.route as RouteKey);
              }}
            >
              Open
            </button>,
          ],
        }))}
        note="Attendance shortage alerts are also sent to the registered guardian by SMS."
        emptyLabel="Nothing in this category."
      />
    </>
  );
};
