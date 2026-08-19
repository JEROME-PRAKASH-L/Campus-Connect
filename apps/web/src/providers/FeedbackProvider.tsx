'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Icon } from '@/components/ui/primitives';
import { Modal, type ModalSpec } from '@/components/ui/Modal';
import { ICONS } from '@/lib/utilities/icons';

type FeedbackValue = {
  toast: (message: string) => void;
  openModal: (spec: ModalSpec) => void;
  closeModal: () => void;
};

const FeedbackContext = createContext<FeedbackValue | null>(null);

/**
 * Toasts and the modal host. Both were embedded in the shell and duplicated on
 * the login screen; keeping them here means a screen only has to ask, and the
 * confirmation copy looks the same wherever it appears.
 */
export const FeedbackProvider = ({ children }: { children: ReactNode }) => {
  const [message, setMessage] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalSpec | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback((next: string) => {
    setMessage(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), 2800);
  }, []);

  useEffect(() => () => (timer.current ? clearTimeout(timer.current) : undefined), []);

  const value = useMemo<FeedbackValue>(() => ({ toast, openModal: setModal, closeModal: () => setModal(null) }), [toast]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      {modal ? <Modal spec={modal} onClose={() => setModal(null)} /> : null}
      {message ? (
        <div
          className="elev-lg anim-fade-up"
          role="status"
          style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 90, background: 'var(--color-bg)', border: '1px solid var(--color-divider)', borderRadius: 10, padding: '11px 15px', display: 'flex', alignItems: 'center', gap: 10, maxWidth: 340 }}
        >
          <span style={{ color: 'var(--status-ok)', flex: 'none' }}>
            <Icon path={ICONS.check} size={16} />
          </span>
          <span style={{ fontSize: 13 }}>{message}</span>
        </div>
      ) : null}
    </FeedbackContext.Provider>
  );
};

export const useFeedback = (): FeedbackValue => {
  const value = useContext(FeedbackContext);
  if (!value) throw new Error('useFeedback must be used inside FeedbackProvider');
  return value;
};
