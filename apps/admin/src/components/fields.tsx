import type { InputHTMLAttributes, ReactNode } from 'react';

const INPUT = 'mt-2 block min-h-11 w-full rounded-md border border-border-strong bg-card px-3 py-2 text-base text-ink';

/** Form fields for the portal's dialogs. Plain elements, so they render on the server and work inside any form. */
export function ReasonField({ label = 'Reason (required, recorded in the audit log)', name = 'reason', required = true, hint }: {
  label?: string; name?: string; required?: boolean; hint?: string;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      {hint && <span className="mt-1 block text-xs font-normal text-ink-muted">{hint}</span>}
      <textarea name={name} required={required} maxLength={2000} rows={3} className={`${INPUT} py-2`} />
    </label>
  );
}

export function SelectField({ name, label, defaultValue, options, hint, required }: {
  name: string; label: string; defaultValue?: string; options: { value: string; label: string }[]; hint?: string; required?: boolean;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      {hint && <span className="mt-1 block text-xs font-normal text-ink-muted">{hint}</span>}
      <select name={name} defaultValue={defaultValue} required={required} className={INPUT}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

export function InputField({ name, label, hint, ...input }: {
  name: string; label: string; hint?: ReactNode;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block text-sm font-medium">
      {label}
      {hint && <span className="mt-1 block text-xs font-normal text-ink-muted">{hint}</span>}
      <input name={name} className={INPUT} {...input} />
    </label>
  );
}

export function CheckboxField({ name, label, defaultChecked, hint }: { name: string; label: string; defaultChecked?: boolean; hint?: string }) {
  return (
    <label className="flex min-h-11 items-start gap-3 text-sm font-medium">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-1 size-5 accent-primary" />
      <span>
        {label}
        {hint && <span className="mt-0.5 block text-xs font-normal text-ink-muted">{hint}</span>}
      </span>
    </label>
  );
}

export function TextAreaField({ name, label, defaultValue, maxLength, rows = 4, required }: {
  name: string; label: string; defaultValue?: string; maxLength?: number; rows?: number; required?: boolean;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <textarea name={name} defaultValue={defaultValue} maxLength={maxLength} rows={rows} required={required} className={`${INPUT} py-2`} />
    </label>
  );
}
