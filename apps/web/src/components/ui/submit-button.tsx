'use client';

import type { ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { buttonClasses } from './button-link';

export type SubmitButtonProps = { children: ReactNode; pendingLabel: string; className?: string };

/** The form's submit button: disabled while the form is sending, so a double tap sends once. */
export function SubmitButton({ children, pendingLabel, className }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-disabled={pending} className={`${buttonClasses('primary', 'lg')} w-full disabled:opacity-60 ${className ?? ''}`}>
      {pending ? pendingLabel : children}
    </button>
  );
}
