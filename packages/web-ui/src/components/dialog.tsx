'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { buttonClasses } from './button-link';
import { Icon } from './icon';

export type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  /** Buttons, right-aligned (on a phone they stack full width). */
  footer?: ReactNode;
};

/**
 * A modal built on the native <dialog>: focus is trapped and restored, Esc closes it, and the page behind
 * is inert. On a phone it is a bottom sheet (full width, rounded top, safe-area padding); from 768 px it
 * is a centred dialog.
 */
export function Dialog({ open, onClose, title, description, children, footer }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClose={onClose}
      // A click on the backdrop lands on the dialog element itself; clicks inside land on its children.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[90dvh] w-full max-w-none overflow-y-auto rounded-t-xl border border-border bg-card p-0 text-ink shadow-lg backdrop:bg-ink/40 md:inset-auto md:m-auto md:max-w-lg md:rounded-xl"
    >
      <div className="p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-xl font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 -mt-2 inline-flex size-11 items-center justify-center rounded-pill text-ink-muted hover:bg-primary-soft hover:text-ink">
            <Icon name="close" />
          </button>
        </div>
        {description && <p id={descriptionId} className="mt-2 text-ink-muted">{description}</p>}
        {children && <div className="mt-4">{children}</div>}
        {footer && <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">{footer}</div>}
      </div>
    </dialog>
  );
}

export type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  /** Name the thing being changed: "Remove Ana from Kape ni Juan?", not "Are you sure?". */
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** Destructive actions use the red button. */
  danger?: boolean;
};

export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel, cancelLabel = 'Cancel', danger }: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <button type="button" onClick={onClose} className={buttonClasses('secondary')}>{cancelLabel}</button>
          <button
            type="button"
            onClick={() => { onConfirm(); onClose(); }}
            className={danger ? `${buttonClasses('primary')} !bg-danger !text-on-danger` : buttonClasses('primary')}
          >
            {confirmLabel}
          </button>
        </>
      }
    />
  );
}
