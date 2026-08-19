'use client';

import type { CSSProperties } from 'react';
import { Field, errorBorder } from './Field';

type Base = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  span?: number;
  style?: CSSProperties;
};

const control = (props: Base, type: string, extra?: CSSProperties, inputMode?: 'numeric' | 'tel' | 'email') => (
  <input
    id={props.id}
    className="input"
    type={type}
    inputMode={inputMode}
    value={props.value}
    disabled={props.disabled}
    placeholder={props.placeholder}
    aria-invalid={props.error ? true : undefined}
    aria-describedby={props.error ? `${props.id}-error` : undefined}
    onChange={(e) => props.onChange(e.target.value)}
    style={{ ...errorBorder(props.error), ...extra, ...props.style }}
  />
);

export const TextInput = (props: Base) => (
  <Field {...props} span={props.span}>
    {control(props, 'text')}
  </Field>
);

export const NumberInput = (props: Base & { min?: number; max?: number; step?: number }) => (
  <Field {...props} span={props.span}>
    <input
      id={props.id}
      className="input figure"
      type="number"
      min={props.min}
      max={props.max}
      step={props.step ?? 1}
      value={props.value}
      disabled={props.disabled}
      placeholder={props.placeholder}
      aria-invalid={props.error ? true : undefined}
      onChange={(e) => props.onChange(e.target.value)}
      style={{ ...errorBorder(props.error), ...props.style }}
    />
  </Field>
);

export const EmailInput = (props: Base) => (
  <Field {...props} span={props.span}>
    {control(props, 'email', undefined, 'email')}
  </Field>
);

export const PhoneInput = (props: Base) => (
  <Field {...props} span={props.span}>
    {control(props, 'tel', undefined, 'tel')}
  </Field>
);

export const PasswordInput = (props: Base & { autoComplete?: string }) => (
  <Field {...props} span={props.span}>
    <input
      id={props.id}
      className="input"
      type="password"
      autoComplete={props.autoComplete ?? 'new-password'}
      value={props.value}
      disabled={props.disabled}
      placeholder={props.placeholder}
      aria-invalid={props.error ? true : undefined}
      onChange={(e) => props.onChange(e.target.value)}
      style={{ ...errorBorder(props.error), ...props.style }}
    />
  </Field>
);

export const DatePicker = (props: Base) => (
  <Field {...props} span={props.span}>
    {control(props, 'date')}
  </Field>
);

export const TimePicker = (props: Base) => (
  <Field {...props} span={props.span}>
    {control(props, 'time')}
  </Field>
);

export const TextArea = (props: Base & { rows?: number }) => (
  <Field {...props} span={props.span ?? 2}>
    <textarea
      id={props.id}
      className="input"
      rows={props.rows ?? 4}
      value={props.value}
      disabled={props.disabled}
      placeholder={props.placeholder}
      aria-invalid={props.error ? true : undefined}
      onChange={(e) => props.onChange(e.target.value)}
      style={{ ...errorBorder(props.error), ...props.style }}
    />
  </Field>
);

export type Option = { value: string; label: string };

export const SelectInput = ({
  options,
  emptyLabel,
  ...props
}: Base & { options: Option[]; emptyLabel?: string }) => (
  <Field {...props} span={props.span}>
    <select
      id={props.id}
      className="input"
      value={props.value}
      disabled={props.disabled}
      aria-invalid={props.error ? true : undefined}
      onChange={(e) => props.onChange(e.target.value)}
      style={{ ...errorBorder(props.error), ...props.style }}
    >
      {emptyLabel !== undefined ? <option value="">{emptyLabel}</option> : null}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  </Field>
);

/** Values are held as a comma-separated string so the whole form stays `Record<string, string>`. */
export const MultiSelectInput = ({
  options,
  ...props
}: Omit<Base, 'placeholder'> & { options: Option[] }) => {
  const selected = props.value ? props.value.split(',').filter(Boolean) : [];
  const toggle = (value: string) => {
    const next = selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value];
    props.onChange(next.join(','));
  };
  return (
    <Field {...props} span={props.span ?? 2}>
      <div
        id={props.id}
        role="group"
        aria-label={props.label}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          padding: 8,
          border: `1px solid ${props.error ? 'var(--status-bad)' : 'var(--color-divider)'}`,
          borderRadius: 10,
          background: 'var(--color-surface)',
        }}
      >
        {options.length === 0 ? <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>Nothing to choose from yet.</span> : null}
        {options.map((o) => {
          const on = selected.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              disabled={props.disabled}
              onClick={() => toggle(o.value)}
              aria-pressed={on}
              className={`tag ${on ? 'tag-accent' : 'tag-outline'}`}
              style={{ cursor: 'pointer', border: on ? '1px solid var(--color-accent)' : '1px solid var(--color-divider)' }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </Field>
  );
};
