'use client';

import type { RouteKey, SessionUser } from '@campus-connect/contracts';
import type { ModalSpec } from '@/components/ui/Modal';
import { useFeedback } from '@/providers/FeedbackProvider';
import { useNavigation } from '@/providers/NavigationProvider';
import { useNotifications } from '@/providers/NotificationsProvider';
import { useCurrentUser } from '@/providers/SessionProvider';
import { ACADEMIC_YEAR } from './shell-labels';

export type ShellContextValue = {
  user: SessionUser;
  route: RouteKey;
  go: (route: RouteKey) => void;
  toast: (message: string) => void;
  openModal: (spec: ModalSpec) => void;
  closeModal: () => void;
  refreshNotifications: () => Promise<void>;
  academicYear: string;
};

/**
 * The façade every feature screen already codes against, now assembled from the
 * focused providers instead of one god component. Keeping the shape identical is
 * what let the seventeen screens move without a rewrite.
 */
export const useShell = (): ShellContextValue => {
  const user = useCurrentUser();
  const { route, go } = useNavigation();
  const { toast, openModal, closeModal } = useFeedback();
  const { refresh } = useNotifications();

  return {
    user,
    route,
    go,
    toast,
    openModal,
    closeModal,
    refreshNotifications: refresh,
    academicYear: ACADEMIC_YEAR,
  };
};
