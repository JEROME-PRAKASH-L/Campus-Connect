'use client';

import type { ReactNode } from 'react';

export const Spinner = ({ label = 'Loading…' }: { label?: string }) => (
  <div role="status" aria-live="polite" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 2px', color: 'var(--muted)', fontSize: 13.5 }}>
    <span
      aria-hidden="true"
      style={{
        width: 15,
        height: 15,
        flex: 'none',
        borderRadius: 999,
        border: '2px solid var(--color-divider)',
        borderTopColor: 'var(--color-accent)',
        animation: 'cc-spin .7s linear infinite',
      }}
    />
    <span>{label}</span>
    <style>{'@keyframes cc-spin{to{transform:rotate(360deg)}}'}</style>
  </div>
);

export const EmptyState = ({ title, body, action }: { title: string; body?: string; action?: ReactNode }) => (
  <div style={{ padding: '36px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
    <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 16 }}>{title}</div>
    {body ? <div style={{ fontSize: 13, color: 'var(--muted)', maxWidth: '46ch', lineHeight: 1.5 }}>{body}</div> : null}
    {action ? <div style={{ marginTop: 6 }}>{action}</div> : null}
  </div>
);

export const ErrorState = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div
    role="alert"
    style={{ border: '1px solid var(--status-bad)', background: 'var(--bad-fill)', color: 'var(--bad-ink)', borderRadius: 10, padding: '11px 13px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}
  >
    <span style={{ flex: 1, minWidth: 0, fontSize: 13.5 }}>{message}</span>
    {onRetry ? (
      <button type="button" className="btn btn-secondary" style={{ fontSize: 12.5 }} onClick={onRetry}>
        Try again
      </button>
    ) : null}
  </div>
);

export const SuccessBanner = ({ message, onDismiss }: { message: string; onDismiss?: () => void }) => (
  <div
    role="status"
    style={{ border: '1px solid var(--status-ok)', background: 'var(--ok-fill)', color: 'var(--ok-ink)', borderRadius: 10, padding: '10px 13px', display: 'flex', alignItems: 'center', gap: 12 }}
  >
    <span style={{ flex: 1, minWidth: 0, fontSize: 13.5 }}>{message}</span>
    {onDismiss ? (
      <button type="button" className="btn btn-ghost" style={{ fontSize: 12, color: 'inherit' }} onClick={onDismiss}>
        Dismiss
      </button>
    ) : null}
  </div>
);

export const PermissionNotice = ({ what }: { what: string }) => (
  <div
    role="note"
    style={{ border: '1px solid var(--color-divider)', borderLeft: '3px solid var(--status-warn)', borderRadius: 10, padding: '11px 13px', fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.5 }}
  >
    Your role does not include permission to {what}. Ask an administrator if you need it.
  </div>
);
