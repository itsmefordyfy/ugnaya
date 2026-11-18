'use client';

import { useEffect, useRef } from 'react';
import { useToast } from '@ugnaya/web-ui';
import type { ActionState } from '@/lib/action-state';

/** Shows a toast when a Server Action answers with success. The form itself keeps the error next to the fields. */
export function useActionToast(state: ActionState, onSuccess?: () => void) {
  const toast = useToast();
  const seen = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!state.at || state.at === seen.current) return;
    seen.current = state.at;
    if (state.ok && state.message) {
      toast.show({ tone: 'success', title: state.message });
      onSuccess?.();
    }
  }, [state, toast, onSuccess]);
}
