'use client';

import { useState } from 'react';
import { ConfirmDialog, Dialog, buttonClasses, useToast } from '@ugnaya/web-ui';

const button = buttonClasses('secondary');

/** Live examples of the interactive components: dialog (a bottom sheet on a phone), confirmation, toasts. */
export function Demos() {
  const [dialog, setDialog] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const toast = useToast();
  return (
    <div className="flex flex-wrap gap-3">
      <button type="button" className={button} onClick={() => setDialog(true)}>Open dialog / sheet</button>
      <button type="button" className={button} onClick={() => setConfirm(true)}>Confirm a removal</button>
      <button type="button" className={button} onClick={() => toast.show({ tone: 'success', title: '+25 points added to Maria' })}>Success toast</button>
      <button type="button" className={button} onClick={() => toast.show({ tone: 'success', title: 'Reward claimed', action: { label: 'Undo', onAction: () => toast.show({ tone: 'info', title: 'Undone' }) } })}>Toast with action</button>
      <button type="button" className={button} onClick={() => toast.show({ tone: 'error', title: 'That code has expired', body: 'Ask the customer to refresh their QR.' })}>Error toast</button>
      <Dialog
        open={dialog}
        onClose={() => setDialog(false)}
        title="Redeem a free upsize?"
        description="This uses 60 points from Kape ni Juan. Points have no cash value."
        footer={
          <>
            <button type="button" className={buttonClasses('secondary')} onClick={() => setDialog(false)}>Not now</button>
            <button type="button" className={buttonClasses('reward')} onClick={() => setDialog(false)}>Redeem</button>
          </>
        }
      />
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => toast.show({ tone: 'success', title: 'Ana was removed' })}
        title="Remove Ana from Kape ni Juan?"
        description="Ana will no longer be able to award or redeem points. Her past transactions stay in the history."
        confirmLabel="Remove"
        danger
      />
    </div>
  );
}
