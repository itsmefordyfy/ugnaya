'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { addToast, dismissToast, ttlFor, type Toast } from '../lib/toast-state';
import { Icon, type IconName } from './icon';

type ShowToast = Omit<Toast, 'id'> & { id?: string };
type ToastApi = { show: (toast: ShowToast) => void; dismiss: (id: string) => void };

const ToastContext = createContext<ToastApi | null>(null);

/** Notifications are for passing feedback. Anything the person must be able to find again belongs on the page. */
export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast needs a <ToastProvider> above it.');
  return api;
}

const ICONS: Record<Toast['tone'], IconName> = { success: 'check_circle', info: 'info', error: 'error' };
const TONES: Record<Toast['tone'], string> = { success: 'text-success-text', info: 'text-info-text', error: 'text-danger-text' };

let counter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = useCallback((id: string) => setToasts((list) => dismissToast(list, id)), []);
  const show = useCallback((toast: ShowToast) => setToasts((list) => addToast(list, { ...toast, id: toast.id ?? `toast-${++counter}` })), []);

  return (
    <ToastContext value={{ show, dismiss }}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[70] flex flex-col gap-2 pb-[env(safe-area-inset-bottom)] md:inset-x-auto md:bottom-auto md:right-4 md:top-4 md:w-96">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
        ))}
      </div>
    </ToastContext>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    const ttl = ttlFor(toast);
    if (ttl === null) return;
    const timer = setTimeout(onDismiss, ttl);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  return (
    <div
      role={toast.tone === 'error' ? 'alert' : 'status'}
      className="pointer-events-auto flex items-start gap-3 rounded-lg border border-border bg-card p-4 shadow-md"
    >
      <Icon name={ICONS[toast.tone]} className={`mt-0.5 shrink-0 ${TONES[toast.tone]}`} />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{toast.title}</p>
        {toast.body && <p className="mt-0.5 text-sm text-ink-muted">{toast.body}</p>}
        {toast.action && (
          <button type="button" onClick={() => { toast.action?.onAction(); onDismiss(); }} className="link mt-1 min-h-11 text-sm font-semibold">
            {toast.action.label}
          </button>
        )}
      </div>
      <button type="button" onClick={onDismiss} aria-label="Dismiss" className="-mr-2 -mt-2 inline-flex size-11 shrink-0 items-center justify-center rounded-pill text-ink-muted hover:bg-primary-soft hover:text-ink">
        <Icon name="close" size={20} />
      </button>
    </div>
  );
}
