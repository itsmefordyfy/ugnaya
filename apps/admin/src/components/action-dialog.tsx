'use client';

import { useState, type ReactNode } from 'react';
import { Dialog, FormMessage, Icon, SubmitButton, buttonClasses, useToast, type IconName } from '@ugnaya/web-ui';
import type { FormAction } from '@/lib/action-state';

export type ActionDialogProps = {
  triggerLabel: string;
  triggerIcon?: IconName;
  triggerVariant?: 'primary' | 'secondary' | 'danger' | 'link';
  title: string;
  description?: string;
  /** A server action; it checks nothing itself that the database doesn't check again. */
  action: FormAction;
  hidden?: Record<string, string>;
  submitLabel: string;
  pendingLabel: string;
  successMessage: string;
  danger?: boolean;
  /** Adds a hidden `idempotencyKey`, new each time the dialog opens, kept across retries of that same form. */
  idempotent?: boolean;
  /** The form's fields (server-rendered is fine). */
  children?: ReactNode;
};

const TRIGGERS = {
  primary: buttonClasses('primary'),
  secondary: buttonClasses('secondary'),
  danger: `${buttonClasses('secondary')} !border-danger !text-danger-text hover:!bg-danger-soft`,
  link: 'link inline-flex min-h-11 items-center gap-1 text-sm font-semibold',
};

/** A button that opens a confirmation form for one audited action. Errors stay in the dialog; success closes it with a toast. */
export function ActionDialog({
  triggerLabel, triggerIcon, triggerVariant = 'secondary', title, description, action, hidden, submitLabel, pendingLabel,
  successMessage, danger, idempotent, children,
}: ActionDialogProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [formKey, setFormKey] = useState(0);
  const [key, setKey] = useState('');
  const toast = useToast();

  const show = () => {
    setError(undefined);
    setFormKey((k) => k + 1);
    if (idempotent) setKey(crypto.randomUUID());
    setOpen(true);
  };
  const submit = async (form: FormData) => {
    const result = await action(form);
    if (result.ok) {
      toast.show({ tone: 'success', title: result.message ?? successMessage });
      setOpen(false);
    } else {
      setError(result.error ?? 'Something went wrong. Please try again.');
    }
  };

  return (
    <>
      <button type="button" className={TRIGGERS[triggerVariant]} onClick={show}>
        {triggerIcon && <Icon name={triggerIcon} size={18} />}
        {triggerLabel}
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title={title} description={description}>
        <form key={formKey} action={submit} className="space-y-4">
          {hidden && Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
          {idempotent && <input type="hidden" name="idempotencyKey" value={key} />}
          <FormMessage message={error} />
          {children}
          <SubmitButton pendingLabel={pendingLabel} className={danger ? '!bg-danger !text-on-danger' : undefined}>{submitLabel}</SubmitButton>
        </form>
      </Dialog>
    </>
  );
}
