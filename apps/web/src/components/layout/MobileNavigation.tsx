'use client';

/** Scrim behind the slide-over sidebar on narrow screens. */
export const MobileNavigation = ({ open, onClose }: { open: boolean; onClose: () => void }) =>
  open ? <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(10,14,18,.5)', zIndex: 55 }} /> : null;
