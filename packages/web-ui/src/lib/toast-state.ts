/** The rules for toast notifications, kept pure so they can be tested (docs/BRAND_AND_DESIGN_SYSTEM.md, section 6). */
export type Toast = {
  id: string;
  tone: 'success' | 'info' | 'error';
  title: string;
  body?: string;
  action?: { label: string; onAction: () => void };
};

/** More than this at once is noise: the oldest goes. */
export const MAX_TOASTS = 3;

export function addToast(list: Toast[], toast: Toast): Toast[] {
  const without = list.filter((t) => t.id !== toast.id);
  return [...without, toast].slice(-MAX_TOASTS);
}

export const dismissToast = (list: Toast[], id: string): Toast[] => list.filter((t) => t.id !== id);

/** Milliseconds before a toast leaves on its own; null = it stays until dismissed (errors). */
export function ttlFor(toast: Toast): number | null {
  if (toast.tone === 'error') return null;
  return toast.action ? 6000 : 4000;
}
