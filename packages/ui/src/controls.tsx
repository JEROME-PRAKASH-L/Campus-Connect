'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Option } from './inputs';

export const SearchBox = ({
  value,
  onChange,
  placeholder = 'Search…',
  label = 'Search',
  debounceMs = 250,
  width = 240,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  debounceMs?: number;
  width?: number;
}) => {
  const [draft, setDraft] = useState(value);
  const committed = useRef(value);

  // Keep the box in step when the owner resets the query (clearing filters, changing page).
  useEffect(() => {
    if (value !== committed.current) {
      committed.current = value;
      setDraft(value);
    }
  }, [value]);

  useEffect(() => {
    if (draft === committed.current) return;
    const handle = setTimeout(() => {
      committed.current = draft;
      onChange(draft);
    }, debounceMs);
    return () => clearTimeout(handle);
  }, [draft, debounceMs, onChange]);

  return (
    <input
      className="input"
      type="search"
      aria-label={label}
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      style={{ width, minWidth: 150, flex: '0 1 auto' }}
    />
  );
};

export type FilterSpec = { key: string; label: string; options: Option[] };

export const FilterPanel = ({
  filters,
  values,
  onChange,
  onReset,
}: {
  filters: FilterSpec[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onReset?: () => void;
}) => {
  if (!filters.length) return null;
  const active = filters.some((f) => values[f.key]);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
      {filters.map((f) => (
        <select
          key={f.key}
          className="input"
          aria-label={f.label}
          value={values[f.key] ?? ''}
          onChange={(e) => onChange(f.key, e.target.value)}
          style={{ width: 'auto', minWidth: 140, fontSize: 13 }}
        >
          <option value="">{f.label}: all</option>
          {f.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ))}
      {active && onReset ? (
        <button type="button" className="btn btn-ghost" style={{ fontSize: 12 }} onClick={onReset}>
          Clear filters
        </button>
      ) : null}
    </div>
  );
};

export const FormActions = ({
  onCancel,
  onSubmit,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  busy = false,
  disabled = false,
  extra,
}: {
  onCancel?: () => void;
  onSubmit?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  disabled?: boolean;
  extra?: ReactNode;
}) => (
  <div className="dialog-actions">
    {extra}
    {onCancel ? (
      <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>
        {cancelLabel}
      </button>
    ) : null}
    <button type={onSubmit ? 'button' : 'submit'} className="btn btn-primary" onClick={onSubmit} disabled={busy || disabled}>
      {busy ? 'Working…' : submitLabel}
    </button>
  </div>
);

export const ConfirmationDialog = ({
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'accent',
  busy = false,
  error,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'accent' | 'danger';
  busy?: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div className="dialog-backdrop anim-pop" style={{ zIndex: 85 }} onClick={onCancel}>
      <div className="dialog" style={{ width: 'min(440px,100%)' }} onClick={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true" aria-label={title}>
        <div className="dialog-title">{title}</div>
        <div style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--muted)' }}>{body}</div>
        {error ? (
          <div style={{ border: '1px solid var(--status-bad)', borderRadius: 8, color: 'var(--status-bad)', fontSize: 12.5, padding: '8px 10px' }} role="alert">
            {error}
          </div>
        ) : null}
        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onConfirm}
            disabled={busy}
            style={tone === 'danger' ? { background: 'var(--status-bad)', borderColor: 'var(--status-bad)' } : undefined}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
