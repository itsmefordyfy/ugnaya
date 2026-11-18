'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

export type LocalTimeProps = { iso: string | null | undefined; mode?: 'datetime' | 'date' | 'relative-date' };

/**
 * A moment in the viewer's own locale and time zone. The server can't know either, so it renders UTC and the browser
 * replaces it once hydrated (useSyncExternalStore gives the server snapshot during hydration: no mismatch).
 */
export function LocalTime({ iso, mode = 'datetime' }: LocalTimeProps) {
  const inBrowser = useSyncExternalStore(subscribe, () => true, () => false);
  if (!iso) return <span className="text-ink-muted">—</span>;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return <span className="text-ink-muted">—</span>;
  const text = inBrowser
    ? mode === 'datetime'
      ? date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
      : date.toLocaleDateString(undefined, { dateStyle: 'medium' })
    : `${date.toISOString().slice(0, mode === 'datetime' ? 16 : 10).replace('T', ' ')} UTC`;
  return <time dateTime={iso} title={date.toISOString()} className="tabular whitespace-nowrap">{text}</time>;
}
