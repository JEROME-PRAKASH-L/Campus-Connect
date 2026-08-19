'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { NotificationItem } from '@campus-connect/contracts';
import { api, post } from '@/lib/api';
import { useNavigation } from './NavigationProvider';
import { useSession } from './SessionProvider';

type NotificationsValue = {
  notifications: NotificationItem[];
  unread: number;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsValue | null>(null);

export const NotificationsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useSession();
  const { route } = useNavigation();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const refresh = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      return;
    }
    try {
      const data = await api<{ notifications: NotificationItem[] }>('/api/notifications');
      setNotifications(data.notifications);
    } catch {
      setNotifications([]);
    }
  }, [user]);

  // Re-read on every screen change: an action on one screen (saving a register,
  // paying a fee) can raise a notification the header should show immediately.
  useEffect(() => {
    void refresh();
  }, [refresh, route]);

  const markRead = useCallback(
    async (id: string) => {
      await post(`/api/notifications/${id}/read`);
      await refresh();
    },
    [refresh],
  );

  const markAllRead = useCallback(async () => {
    await post('/api/notifications/read-all');
    await refresh();
  }, [refresh]);

  const value = useMemo<NotificationsValue>(
    () => ({ notifications, unread: notifications.filter((n) => !n.read).length, refresh, markRead, markAllRead }),
    [notifications, refresh, markRead, markAllRead],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
};

export const useNotifications = (): NotificationsValue => {
  const value = useContext(NotificationsContext);
  if (!value) throw new Error('useNotifications must be used inside NotificationsProvider');
  return value;
};
