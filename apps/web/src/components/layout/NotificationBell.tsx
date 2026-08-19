'use client';

import { useState } from 'react';
import type { RouteKey } from '@campus-connect/contracts';
import { Icon } from '@/components/ui/primitives';
import { ICONS } from '@/lib/utilities/icons';
import { relativeTime, toneVar } from '@/lib/utilities/format';
import { useNotifications } from '@/providers/NotificationsProvider';

const iconFor = (kind: string) => (kind === 'FEES' ? ICONS.card : kind === 'ATTENDANCE' ? ICONS.alert : kind === 'RESULTS' ? ICONS.award : ICONS.file);

export const NotificationBell = ({ onGo, onToast }: { onGo: (route: RouteKey) => void; onToast: (message: string) => void }) => {
  const { notifications, unread, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: 'relative', flex: 'none' }}>
      <button type="button" className="btn btn-secondary btn-icon" onClick={() => setOpen((v) => !v)} title="Notifications" aria-label="Notifications">
        <Icon path={ICONS.bell} />
      </button>
      {unread ? (
        <span style={{ position: 'absolute', top: -5, right: -5, minWidth: 17, height: 17, padding: '0 4px', display: 'grid', placeItems: 'center', borderRadius: 999, background: 'var(--color-accent)', color: '#fff', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 11 }}>
          {unread}
        </span>
      ) : null}
      {open ? (
        <div className="elev-lg anim-pop" style={{ position: 'absolute', top: 44, right: 0, width: 'min(370px,84vw)', background: 'var(--color-bg)', border: '1px solid var(--color-divider)', borderRadius: 10, zIndex: 70, maxHeight: 400, overflow: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderBottom: '1px solid var(--color-divider)' }}>
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 14, letterSpacing: '.06em', textTransform: 'uppercase' }}>Notifications</span>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ fontSize: 11.5 }}
              onClick={async () => {
                await markAllRead();
                onToast('All notifications marked as read.');
              }}
            >
              Mark all read
            </button>
          </div>
          {notifications.slice(0, 6).map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={async () => {
                await markRead(n.id);
                setOpen(false);
                onGo(n.route as RouteKey);
              }}
              style={{ display: 'flex', gap: 10, width: '100%', textAlign: 'left', padding: '10px 12px', border: 0, borderBottom: '1px solid var(--color-divider)', background: n.read ? 'transparent' : 'color-mix(in srgb, var(--color-accent) 6%, transparent)', color: 'inherit', cursor: 'pointer' }}
            >
              <span style={{ width: 26, height: 26, flex: 'none', display: 'grid', placeItems: 'center', border: '1px solid var(--color-divider)', borderRadius: 8, color: toneVar(n.tone) }}>
                <Icon path={iconFor(n.kind)} size={14} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13, lineHeight: 1.3 }}>{n.title}</span>
                <span style={{ display: 'block', fontSize: 11.5, opacity: 0.72, marginTop: 2 }}>{n.body}</span>
                <span style={{ display: 'block', fontSize: 11.5, letterSpacing: '.1em', textTransform: 'uppercase', opacity: 0.62, marginTop: 3 }}>{relativeTime(n.createdAt)}</span>
              </span>
            </button>
          ))}
          {notifications.length === 0 ? <div style={{ padding: 14, fontSize: 13, opacity: 0.7 }}>Nothing new.</div> : null}
        </div>
      ) : null}
    </div>
  );
};
