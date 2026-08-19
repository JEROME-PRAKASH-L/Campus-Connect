'use client';

import { useMemo, useState, type FormEvent } from 'react';
import type { ZodTypeAny } from 'zod';
import type { UploadPurpose } from '@campus-connect/contracts';
import {
  DatePicker,
  EmailInput,
  FileUpload,
  FormActions,
  ImageUpload,
  MultiSelectInput,
  NumberInput,
  PasswordInput,
  PhoneInput,
  SelectInput,
  TextArea,
  TextInput,
  TimePicker,
  type Option,
  type UploadedFile,
} from '@campus-connect/ui';
import { UPLOAD_RULES } from '@campus-connect/contracts';
import { uploadFile } from '@/lib/api';
import { fieldErrorsFrom, messageFrom } from '@/lib/api/errors';
import { validateWith } from '@/lib/validation/validate';

export type FieldKind =
  | 'text'
  | 'number'
  | 'email'
  | 'phone'
  | 'password'
  | 'select'
  | 'multiselect'
  | 'date'
  | 'time'
  | 'textarea'
  | 'checkbox'
  | 'file'
  | 'image';

export type FieldSpec = {
  key: string;
  label: string;
  kind: FieldKind;
  hint?: string;
  placeholder?: string;
  required?: boolean;
  span?: number;
  options?: Option[];
  min?: number;
  max?: number;
  /** Required for `file` and `image` fields — decides the accepted types and size cap. */
  purpose?: UploadPurpose;
  /** Hide the field entirely, e.g. a column only an administrator may set. */
  hidden?: boolean;
  readOnly?: boolean;
};

export type ResourceFormProps = {
  fields: FieldSpec[];
  initial?: Record<string, string>;
  /** The same Zod object the API validates with, so both ends agree. */
  schema: ZodTypeAny;
  submitLabel?: string;
  busy?: boolean;
  onCancel?: () => void;
  onSubmit: (values: Record<string, string>) => Promise<void>;
};

const blank = (fields: FieldSpec[], initial: Record<string, string> = {}): Record<string, string> =>
  Object.fromEntries(fields.map((f) => [f.key, initial[f.key] ?? (f.kind === 'checkbox' ? 'false' : '')]));

/**
 * A form driven by a field list and a Zod schema.
 *
 * The flow is the one the brief describes: the browser validates with the shared
 * contract, sends the request, and merges any `fieldErrors` the API returns back
 * onto the same inputs — so a rule enforced server-side still reads as a
 * field-level message rather than a bare toast.
 */
export const ResourceForm = ({ fields, initial, schema, submitLabel = 'Save', busy = false, onCancel, onSubmit }: ResourceFormProps) => {
  const visible = useMemo(() => fields.filter((f) => !f.hidden), [fields]);
  const [values, setValues] = useState<Record<string, string>>(() => blank(visible, initial));
  const [uploads, setUploads] = useState<Record<string, UploadedFile | null>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const set = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: '' } : prev));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError('');

    // Drop empty *optional* fields so `.optional()` behaves as written, but keep
    // blank required ones: a present empty string trips the schema's own
    // "<Field> is required." rather than Zod's generic "Required".
    const required = new Set(visible.filter((f) => f.required).map((f) => f.key));
    const payload = Object.fromEntries(Object.entries(values).filter(([key, v]) => v !== '' || required.has(key)));
    const result = validateWith(schema, payload);
    if (!result.ok) {
      setErrors(result.fieldErrors);
      setFormError(result.message);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(values);
      setErrors({});
    } catch (error) {
      const fieldErrors = fieldErrorsFrom(error);
      setErrors(fieldErrors);
      setFormError(messageFrom(error));
    } finally {
      setSubmitting(false);
    }
  };

  const working = busy || submitting;

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }} noValidate>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 'var(--space-3) var(--space-4)' }}>
        {visible.map((field) => {
          const common = {
            id: `f-${field.key}`,
            label: field.label,
            value: values[field.key] ?? '',
            onChange: (v: string) => set(field.key, v),
            hint: field.hint,
            error: errors[field.key],
            required: field.required,
            disabled: working || field.readOnly,
            placeholder: field.placeholder,
            span: field.span,
          };

          switch (field.kind) {
            case 'number':
              return <NumberInput key={field.key} {...common} min={field.min} max={field.max} />;
            case 'email':
              return <EmailInput key={field.key} {...common} />;
            case 'phone':
              return <PhoneInput key={field.key} {...common} />;
            case 'password':
              return <PasswordInput key={field.key} {...common} />;
            case 'date':
              return <DatePicker key={field.key} {...common} />;
            case 'time':
              return <TimePicker key={field.key} {...common} />;
            case 'textarea':
              return <TextArea key={field.key} {...common} />;
            case 'select':
              return <SelectInput key={field.key} {...common} options={field.options ?? []} emptyLabel={field.required ? undefined : '—'} />;
            case 'multiselect':
              return <MultiSelectInput key={field.key} {...common} options={field.options ?? []} />;
            case 'checkbox':
              return (
                <SelectInput
                  key={field.key}
                  {...common}
                  options={[
                    { value: 'false', label: 'No' },
                    { value: 'true', label: 'Yes' },
                  ]}
                />
              );
            case 'file':
            case 'image': {
              const purpose = field.purpose ?? 'SUBMISSION';
              const rule = UPLOAD_RULES[purpose];
              const Control = field.kind === 'image' ? ImageUpload : FileUpload;
              return (
                <Control
                  key={field.key}
                  id={common.id}
                  label={field.label}
                  hint={field.hint}
                  error={errors[field.key]}
                  required={field.required}
                  disabled={working}
                  span={field.span}
                  accept={rule.mimeTypes.join(',')}
                  maxBytes={rule.maxBytes}
                  value={uploads[field.key] ?? null}
                  onUpload={(file) => uploadFile(file, purpose)}
                  onChange={(uploaded) => {
                    setUploads((prev) => ({ ...prev, [field.key]: uploaded }));
                    set(field.key, uploaded?.fileId ?? '');
                  }}
                />
              );
            }
            default:
              return <TextInput key={field.key} {...common} />;
          }
        })}
      </div>

      {formError ? (
        <div role="alert" style={{ border: '1px solid var(--status-bad)', borderRadius: 8, color: 'var(--status-bad)', fontSize: 12.5, padding: '8px 10px' }}>
          {formError}
        </div>
      ) : null}

      <FormActions onCancel={onCancel} submitLabel={submitLabel} busy={working} />
    </form>
  );
};
