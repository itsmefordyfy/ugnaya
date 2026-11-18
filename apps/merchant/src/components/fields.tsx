import type { ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

/** The same outline, height and focus treatment as @ugnaya/web-ui's TextField. */
export const controlClass =
  'mt-2 block min-h-11 w-full rounded-md border border-border-strong bg-card px-3 py-2 text-base text-ink focus:border-accent aria-invalid:border-danger disabled:bg-surface disabled:text-ink-muted';

type FieldChrome = { name: string; label: string; hint?: string; error?: string; className?: string };

function describedBy(id: string, hint?: string, error?: string) {
  return [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
}

function Chrome({ id, label, hint, error, className, children }: { id: string; label: string; hint?: string; error?: string; className?: string; children: ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium">{label}</label>
      {hint && <p id={`${id}-hint`} className="mt-1 text-sm text-ink-muted">{hint}</p>}
      {children}
      {error && <p id={`${id}-error`} className="mt-1 text-sm text-danger">{error}</p>}
    </div>
  );
}

export type SelectFieldProps = FieldChrome & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'name'> & {
  options: readonly { value: string; label: string }[];
  placeholder?: string;
};

export function SelectField({ name, label, hint, error, className, options, placeholder, id, ...select }: SelectFieldProps) {
  const fieldId = id ?? `field-${name}`;
  return (
    <Chrome id={fieldId} label={label} hint={hint} error={error} className={className}>
      <select id={fieldId} name={name} aria-invalid={error ? true : undefined} aria-describedby={describedBy(fieldId, hint, error)} className={controlClass} {...select}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </Chrome>
  );
}

export type TextAreaFieldProps = FieldChrome & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'name'>;

export function TextAreaField({ name, label, hint, error, className, id, rows = 4, ...area }: TextAreaFieldProps) {
  const fieldId = id ?? `field-${name}`;
  return (
    <Chrome id={fieldId} label={label} hint={hint} error={error} className={className}>
      <textarea id={fieldId} name={name} rows={rows} aria-invalid={error ? true : undefined} aria-describedby={describedBy(fieldId, hint, error)} className={controlClass} {...area} />
    </Chrome>
  );
}

export type CheckboxFieldProps = { name: string; label: ReactNode; hint?: string; defaultChecked?: boolean; disabled?: boolean; value?: string };

/** A checkbox with its label as the 44 px target. */
export function CheckboxField({ name, label, hint, defaultChecked, disabled, value }: CheckboxFieldProps) {
  return (
    <label className="flex min-h-11 items-start gap-3">
      <input type="checkbox" name={name} value={value} defaultChecked={defaultChecked} disabled={disabled} className="mt-1 size-5 shrink-0 accent-[var(--color-primary)]" />
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-sm text-ink-muted">{hint}</span>}
      </span>
    </label>
  );
}
