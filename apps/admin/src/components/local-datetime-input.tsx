'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};
const inBrowser = () => true;
const onServer = () => false;

/** "2026-11-07T09:30" in the viewer's time zone, for a datetime-local input. */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

/**
 * A date-and-time field in the viewer's own time zone, plus a hidden `tzOffset` (minutes) so the server can turn the
 * typed local time back into an exact moment. Rendered blank on the server, filled in the browser.
 */
export function LocalDateTimeInput({ name, label, iso, withOffset }: { name: string; label: string; iso?: string | null; withOffset?: boolean }) {
  const browser = useSyncExternalStore(subscribe, inBrowser, onServer);
  return (
    <label className="block text-sm font-medium">
      {label}
      <input type="datetime-local" name={name} defaultValue={browser && iso ? toLocalInput(iso) : ''}
        className="mt-2 block min-h-11 w-full rounded-md border border-border-strong bg-card px-3 py-2 text-base text-ink" />
      {withOffset && <input type="hidden" name="tzOffset" value={browser ? String(new Date().getTimezoneOffset()) : '0'} />}
    </label>
  );
}
