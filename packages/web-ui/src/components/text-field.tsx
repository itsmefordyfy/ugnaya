import type { InputHTMLAttributes } from 'react';

export type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  name: string;
  label: string;
  hint?: string;
  error?: string;
};

/** A labelled input whose hint and error are tied to it for screen readers. */
export function TextField({ name, label, hint, error, id, className, ...input }: TextFieldProps) {
  const fieldId = id ?? `field-${name}`;
  const described = [hint && `${fieldId}-hint`, error && `${fieldId}-error`].filter(Boolean).join(' ') || undefined;
  return (
    <div className={className}>
      <label htmlFor={fieldId} className="block text-sm font-medium">
        {label}
      </label>
      {hint && (
        <p id={`${fieldId}-hint`} className="mt-1 text-sm text-ink-muted">
          {hint}
        </p>
      )}
      <input
        id={fieldId}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={described}
        className="mt-2 block min-h-11 w-full rounded-md border border-border-strong bg-card px-3 py-2 text-base text-ink focus:border-accent aria-invalid:border-danger"
        {...input}
      />
      {error && (
        <p id={`${fieldId}-error`} className="mt-1 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
