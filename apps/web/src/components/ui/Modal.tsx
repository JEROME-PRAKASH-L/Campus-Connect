'use client';

import { useEffect, useState } from 'react';
import { Icon } from './primitives';
import { ICONS } from '@/lib/utilities/icons';

export type ModalField = {
  key: string;
  label: string;
  kind: 'text' | 'date' | 'area' | 'select' | 'file' | 'number';
  placeholder?: string;
  options?: { value: string; label: string }[];
  value?: string;
  span?: number;
};

export type ModalSpec = {
  kicker?: string;
  title: string;
  sub?: string;
  rows?: { k: string; v: string }[];
  big?: string;
  bigLabel?: string;
  fields?: ModalField[];
  note?: string;
  cancelLabel?: string;
  confirmLabel?: string;
  onConfirm?: (form: Record<string, string>) => void | Promise<void>;
};

export const Modal = ({ spec, onClose }: { spec: ModalSpec; onClose: () => void }) => {
  const [form, setForm] = useState<Record<string, string>>(() =>
    Object.fromEntries((spec.fields ?? []).map((f) => [f.key, f.value ?? f.options?.[0]?.value ?? ''])),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const confirm = async () => {
    if (!spec.onConfirm) return;
    setBusy(true);
    setError('');
    try {
      await spec.onConfirm(form);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setBusy(false);
    }
  };

  const set = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="dialog-backdrop anim-pop" style={{ zIndex: 80 }} onClick={onClose}>
      <div className="dialog" style={{ width: 'min(520px,100%)', maxHeight: '86vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={spec.title}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            {spec.kicker ? <div className="card-kicker">{spec.kicker}</div> : null}
            <div className="dialog-title" style={{ marginTop: 2 }}>
              {spec.title}
            </div>
            {spec.sub ? <div style={{ fontSize: 12.5, opacity: 0.72, marginTop: 2 }}>{spec.sub}</div> : null}
          </div>
          <button type="button" className="btn btn-secondary btn-icon" onClick={onClose} title="Close" aria-label="Close">
            <Icon path={ICONS.close} size={15} />
          </button>
        </div>

        {spec.rows?.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid var(--color-divider)' }}>
            {spec.rows.map((r) => (
              <div key={r.k} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--color-divider)' }}>
                <span className="eyebrow" style={{ whiteSpace: 'nowrap' }}>
                  {r.k}
                </span>
                <span style={{ fontSize: 13.5, textAlign: 'right' }}>{r.v}</span>
              </div>
            ))}
          </div>
        ) : null}

        {spec.big ? (
          <div style={{ border: '1px solid var(--color-accent)', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', opacity: 0.72 }}>{spec.bigLabel}</span>
            <span className="figure" style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 29, color: 'var(--color-accent)' }}>
              {spec.big}
            </span>
          </div>
        ) : null}

        {spec.fields?.length ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 'var(--space-3)' }}>
            {spec.fields.map((f) => (
              <div key={f.key} className="field" style={{ gridColumn: `span ${f.span ?? 1}` }}>
                <label htmlFor={`field-${f.key}`}>{f.label}</label>
                {f.kind === 'area' ? (
                  <textarea id={`field-${f.key}`} className="input" placeholder={f.placeholder} value={form[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)} />
                ) : f.kind === 'select' ? (
                  <select id={`field-${f.key}`} className="input" value={form[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)}>
                    {f.options?.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : f.kind === 'file' ? (
                  <div style={{ border: '1px dashed var(--color-divider)', borderRadius: 10, padding: 14, textAlign: 'center', fontSize: 12.5, opacity: 0.7 }}>{f.value}</div>
                ) : (
                  <input
                    id={`field-${f.key}`}
                    className="input"
                    type={f.kind === 'date' ? 'date' : f.kind === 'number' ? 'number' : 'text'}
                    placeholder={f.placeholder}
                    value={form[f.key] ?? ''}
                    onChange={(e) => set(f.key, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>
        ) : null}

        {spec.note ? <div style={{ fontSize: 12, opacity: 0.72, borderLeft: '2px solid var(--color-accent)', paddingLeft: 10 }}>{spec.note}</div> : null}
        {error ? (
          <div style={{ border: '1px solid var(--status-bad)', borderRadius: 8, color: 'var(--status-bad)', fontSize: 12.5, padding: '8px 10px' }}>{error}</div>
        ) : null}

        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {spec.cancelLabel ?? 'Cancel'}
          </button>
          {spec.onConfirm ? (
            <button type="button" className="btn btn-primary" onClick={confirm} disabled={busy}>
              {busy ? 'Working…' : (spec.confirmLabel ?? 'Confirm')}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};
