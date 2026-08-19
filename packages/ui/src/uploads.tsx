'use client';

import { useRef, useState } from 'react';
import { Field } from './Field';

export type UploadedFile = { fileId: string; url: string; fileName: string; sizeBytes: number; mimeType: string };

type UploadProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  span?: number;
  /** Comma-separated MIME list the picker offers and the component enforces. */
  accept: string;
  maxBytes: number;
  value?: UploadedFile | null;
  /** Performs the actual transfer to object storage and resolves with the stored metadata. */
  onUpload: (file: File) => Promise<UploadedFile>;
  onChange: (file: UploadedFile | null) => void;
};

const prettyBytes = (bytes: number) => (bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

const useUploader = ({ accept, maxBytes, onUpload, onChange }: Pick<UploadProps, 'accept' | 'maxBytes' | 'onUpload' | 'onChange'>) => {
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState('');

  const allowed = accept.split(',').map((t) => t.trim()).filter(Boolean);

  const handle = async (file: File | undefined) => {
    if (!file) return;
    setLocalError('');
    if (allowed.length && !allowed.includes(file.type)) {
      setLocalError(`That file type is not accepted here. Allowed: ${allowed.join(', ')}.`);
      return;
    }
    if (file.size > maxBytes) {
      setLocalError(`The file is ${prettyBytes(file.size)}; the limit is ${prettyBytes(maxBytes)}.`);
      return;
    }
    setBusy(true);
    try {
      onChange(await onUpload(file));
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : 'The upload failed. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return { busy, localError, handle };
};

export const FileUpload = ({ value, onChange, ...props }: UploadProps) => {
  const input = useRef<HTMLInputElement>(null);
  const { busy, localError, handle } = useUploader({ ...props, onChange });

  return (
    <Field id={props.id} label={props.label} hint={props.hint} error={props.error ?? localError} required={props.required} span={props.span ?? 2}>
      <div style={{ border: '1px dashed var(--color-divider)', borderRadius: 10, padding: 14, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <input
          ref={input}
          id={props.id}
          type="file"
          accept={props.accept}
          disabled={props.disabled || busy}
          style={{ display: 'none' }}
          onChange={(e) => void handle(e.target.files?.[0])}
        />
        <button type="button" className="btn btn-secondary" style={{ fontSize: 12.5 }} disabled={props.disabled || busy} onClick={() => input.current?.click()}>
          {busy ? 'Uploading…' : value ? 'Replace file' : 'Choose file'}
        </button>
        <span style={{ fontSize: 12.5, color: 'var(--muted)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value ? `${value.fileName} · ${prettyBytes(value.sizeBytes)}` : `Up to ${prettyBytes(props.maxBytes)}`}
        </span>
        {value ? (
          <button type="button" className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => onChange(null)}>
            Remove
          </button>
        ) : null}
      </div>
    </Field>
  );
};

export const ImageUpload = ({ value, onChange, ...props }: UploadProps) => {
  const input = useRef<HTMLInputElement>(null);
  const { busy, localError, handle } = useUploader({ ...props, onChange });

  return (
    <Field id={props.id} label={props.label} hint={props.hint} error={props.error ?? localError} required={props.required} span={props.span ?? 1}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div
          style={{
            width: 72,
            height: 90,
            flex: 'none',
            border: '1px solid var(--color-divider)',
            borderRadius: 8,
            overflow: 'hidden',
            display: 'grid',
            placeItems: 'center',
            background: 'var(--color-surface)',
            fontSize: 11,
            color: 'var(--muted)',
          }}
        >
          {value ? <img src={value.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : 'No image'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          <input
            ref={input}
            id={props.id}
            type="file"
            accept={props.accept}
            disabled={props.disabled || busy}
            style={{ display: 'none' }}
            onChange={(e) => void handle(e.target.files?.[0])}
          />
          <button type="button" className="btn btn-secondary" style={{ fontSize: 12.5 }} disabled={props.disabled || busy} onClick={() => input.current?.click()}>
            {busy ? 'Uploading…' : value ? 'Replace' : 'Upload image'}
          </button>
          {value ? (
            <button type="button" className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => onChange(null)}>
              Remove
            </button>
          ) : (
            <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{prettyBytes(props.maxBytes)} max</span>
          )}
        </div>
      </div>
    </Field>
  );
};
