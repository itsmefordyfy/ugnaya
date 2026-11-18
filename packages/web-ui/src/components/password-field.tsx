'use client';

import { useId, useState, type InputHTMLAttributes } from 'react';
import { Icon } from './icon';

export type PasswordFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  name: string;
  label: string;
  hint?: string;
  error?: string;
};

/** A password input with a show/hide button, so people can check what they typed (especially on a phone). */
export function PasswordField({ name, label, hint, error, id, className, ...input }: PasswordFieldProps) {
  const generated = useId();
  const fieldId = id ?? `field-${name}-${generated}`;
  const [visible, setVisible] = useState(false);
  const described = [hint && `${fieldId}-hint`, error && `${fieldId}-error`].filter(Boolean).join(' ') || undefined;
  return (
    <div className={className}>
      <label htmlFor={fieldId} className="block text-sm font-medium">{label}</label>
      {hint && <p id={`${fieldId}-hint`} className="mt-1 text-sm text-ink-muted">{hint}</p>}
      <div className="relative mt-2">
        <input
          id={fieldId}
          name={name}
          type={visible ? 'text' : 'password'}
          aria-invalid={error ? true : undefined}
          aria-describedby={described}
          className="block min-h-11 w-full rounded-md border border-border-strong bg-card py-2 pl-3 pr-12 text-base text-ink focus:border-accent aria-invalid:border-danger"
          {...input}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-controls={fieldId}
          aria-label={visible ? 'Hide password' : 'Show password'}
          className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center rounded-r-md text-ink-muted hover:text-ink"
        >
          <Icon name={visible ? 'visibility_off' : 'visibility'} size={20} />
        </button>
      </div>
      {error && <p id={`${fieldId}-error`} className="mt-1 text-sm text-danger">{error}</p>}
    </div>
  );
}
