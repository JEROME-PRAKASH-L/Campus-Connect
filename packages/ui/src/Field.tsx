'use client';

import type { ReactNode } from 'react';

export type FieldProps = {
  id: string;
  label: string;
  hint?: string;
  /** Field-level message from Zod or the server. Renders below the control. */
  error?: string;
  required?: boolean;
  span?: number;
  children: ReactNode;
};

/**
 * The one place a labelled control is assembled. Every input in the portal goes
 * through it, so label typography, required markers and error copy stay identical.
 */
export const Field = ({ id, label, hint, error, required, span = 1, children }: FieldProps) => (
  <div className="field" style={{ gridColumn: `span ${span}`, minWidth: 0 }}>
    <label htmlFor={id}>
      {label}
      {required ? <span style={{ color: 'var(--status-bad)', marginLeft: 3 }}>*</span> : null}
    </label>
    {children}
    {error ? (
      <div role="alert" style={{ fontSize: 11.5, color: 'var(--status-bad)', marginTop: 4, lineHeight: 1.35 }}>
        {error}
      </div>
    ) : hint ? (
      <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4, lineHeight: 1.35 }}>{hint}</div>
    ) : null}
  </div>
);

export const errorBorder = (error?: string) => (error ? { borderColor: 'var(--status-bad)' } : undefined);
