'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { FormMessage, Icon, SubmitButton, TextField, buttonClasses } from '@ugnaya/web-ui';
import { CheckboxField, controlClass } from '@/components/fields';
import type { ActionState } from '@/lib/action-state';
import { DAYS, MAX_INTERVALS, type DayKey, type Hours } from '@/lib/hours';
import { saveBranch } from '../actions';

export type BranchFormValues = {
  id: string | null; name: string; address: string | null; city: string | null;
  lat: number | null; lng: number | null; active: boolean; hours: Hours;
};

export function BranchForm({ values }: { values: BranchFormValues }) {
  const [state, action] = useActionState<ActionState, FormData>(saveBranch, {});
  const e = state.fieldErrors ?? {};
  const [locating, setLocating] = useState<string | null>(null);
  const [coords, setCoords] = useState({ lat: values.lat?.toString() ?? '', lng: values.lng?.toString() ?? '' });

  function useMyLocation() {
    if (!('geolocation' in navigator)) return setLocating('This browser can’t share its location. Type the coordinates instead.');
    setLocating('Finding this device’s location…');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setCoords({ lat: p.coords.latitude.toFixed(6), lng: p.coords.longitude.toFixed(6) });
        setLocating('Filled in from this device. Only use it if you’re at the branch now.');
      },
      () => setLocating('Location wasn’t shared. Type the coordinates instead (from Google Maps: press and hold the spot).'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <form action={action} className="space-y-8" noValidate>
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <FormMessage message={state.ok === false ? state.error : undefined} />
      <fieldset className="space-y-5">
        <legend className="font-sans text-lg font-semibold">Branch</legend>
        <TextField name="name" label="Branch name" hint="What staff and customers call it, like “SM Naga” or “Main”." defaultValue={values.name} required maxLength={80} error={e.name} />
        <div className="grid gap-5 md:grid-cols-2">
          <TextField name="address" label="Address" defaultValue={values.address ?? ''} maxLength={200} error={e.address} autoComplete="street-address" />
          <TextField name="city" label="City" defaultValue={values.city ?? ''} maxLength={80} error={e.city} autoComplete="address-level2" />
        </div>
        <div className="space-y-3">
          <p className="text-sm text-ink-muted">Location (optional): lets customers find the branch on a map in the app.</p>
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField name="lat" label="Latitude" inputMode="decimal" placeholder="13.621800" value={coords.lat} onChange={(ev) => setCoords((c) => ({ ...c, lat: ev.target.value }))} error={e.lat} />
            <TextField name="lng" label="Longitude" inputMode="decimal" placeholder="123.194800" value={coords.lng} onChange={(ev) => setCoords((c) => ({ ...c, lng: ev.target.value }))} error={e.lng} />
          </div>
          <button type="button" onClick={useMyLocation} className={buttonClasses('secondary')}>
            <Icon name="location_on" size={20} />Use this device’s location
          </button>
          <p role="status" className="text-sm text-ink-muted">{locating ?? ''}</p>
        </div>
        <CheckboxField name="active" label="Open for business" hint="Turn off for a branch that has closed. Staff can’t award points at an inactive branch." defaultChecked={values.active} />
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="font-sans text-lg font-semibold">Opening hours</legend>
        <p className="text-sm text-ink-muted">Shown to customers in the app. Add a second time range for a break, like 7:00–11:00 and 15:00–21:00.</p>
        <div className="divide-y divide-divider rounded-lg border border-border">
          {DAYS.map((day) => <DayRow key={day.key} day={day} intervals={values.hours[day.key]} error={e[`hours_${day.key}`]} />)}
        </div>
      </fieldset>

      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        <Link href="/branches" className={buttonClasses('secondary', 'lg')}>Cancel</Link>
        <SubmitButton pendingLabel="Saving…" className="sm:w-auto">{values.id ? 'Save branch' : 'Add branch'}</SubmitButton>
      </div>
    </form>
  );
}

function DayRow({ day, intervals, error }: { day: { key: DayKey; label: string }; intervals: { open: string; close: string }[]; error?: string }) {
  const [closed, setClosed] = useState(intervals.length === 0);
  const [count, setCount] = useState(Math.max(1, intervals.length));
  const errorId = `hours-${day.key}-error`;
  return (
    <div className="grid gap-3 p-4 md:grid-cols-[9rem_8rem_1fr] md:items-center">
      <p className="font-medium" id={`hours-${day.key}-label`}>{day.label}</p>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" name={`${day.key}_closed`} checked={closed} onChange={(ev) => setClosed(ev.target.checked)} className="size-5 accent-[var(--color-primary)]" />
        Closed
      </label>
      <div className={closed ? 'hidden' : 'space-y-2'} role="group" aria-labelledby={`hours-${day.key}-label`} aria-describedby={error ? errorId : undefined}>
        {Array.from({ length: count }, (_, n) => (
          <div key={n} className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor={`${day.key}_open_${n}`}>{day.label} opens{n > 0 ? ' (second range)' : ''}</label>
            <input id={`${day.key}_open_${n}`} name={`${day.key}_open_${n}`} type="time" defaultValue={intervals[n]?.open ?? (n === 0 ? '08:00' : '')} className={`${controlClass} mt-0 w-36`} />
            <span aria-hidden="true" className="text-ink-muted">to</span>
            <label className="sr-only" htmlFor={`${day.key}_close_${n}`}>{day.label} closes{n > 0 ? ' (second range)' : ''}</label>
            <input id={`${day.key}_close_${n}`} name={`${day.key}_close_${n}`} type="time" defaultValue={intervals[n]?.close ?? (n === 0 ? '20:00' : '')} className={`${controlClass} mt-0 w-36`} />
            {n > 0 && (
              <button type="button" onClick={() => setCount(1)} className="inline-flex min-h-11 items-center rounded-pill px-3 text-sm font-semibold text-danger-text hover:bg-danger-soft">
                Remove<span className="sr-only"> second range for {day.label}</span>
              </button>
            )}
          </div>
        ))}
        {count < MAX_INTERVALS && (
          <button type="button" onClick={() => setCount(count + 1)} className="inline-flex min-h-11 items-center gap-1 rounded-pill px-3 text-sm font-semibold text-accent-text hover:bg-primary-soft">
            <Icon name="add" size={18} />Add a break<span className="sr-only"> for {day.label}</span>
          </button>
        )}
      </div>
      {error && <p id={errorId} className="text-sm text-danger md:col-span-3">{error}</p>}
    </div>
  );
}
