'use client';

import { useActionState } from 'react';
import { FormMessage, SubmitButton, TextField } from '@ugnaya/web-ui';
import { useActionToast } from '@/components/action-toast';
import { TextAreaField } from '@/components/fields';
import type { ActionState } from '@/lib/action-state';
import { saveProfile } from '../actions';

export type ProfileValues = {
  trade_name: string; legal_name: string | null; description: string | null; address: string | null; city: string;
  contact_email: string | null; contact_phone: string | null; website: string | null; owner_mobile: string | null;
};

export type ProfileFormProps = { values: ProfileValues; readOnly: boolean; nameLocked?: boolean };

/** nameLocked: once UGNAYA has the application, the business and registered names are fixed (the database refuses changes). */
export function ProfileForm({ values, readOnly, nameLocked = false }: ProfileFormProps) {
  const [state, action] = useActionState<ActionState, FormData>(saveProfile, {});
  useActionToast(state);
  const e = state.fieldErrors ?? {};
  const v = (key: keyof ProfileValues) => values[key] ?? '';
  return (
    <form action={action} className="space-y-8" noValidate>
      <FormMessage message={state.ok === false ? state.error : undefined} />
      <fieldset disabled={readOnly} className="space-y-5">
        <legend className="font-sans text-lg font-semibold">What customers see</legend>
        <div className="grid gap-5 md:grid-cols-2">
          <TextField name="trade_name" label="Business name" defaultValue={v('trade_name')} required maxLength={80} error={e.trade_name} autoComplete="organization"
            readOnly={nameLocked} hint={nameLocked ? 'Fixed once UGNAYA reviews your business. Email us to change it.' : undefined} />
          <TextField name="city" label="City" defaultValue={v('city')} required maxLength={80} error={e.city} autoComplete="address-level2" />
        </div>
        <TextField name="address" label="Address" hint="The main branch. Each branch has its own address under Branches & hours." defaultValue={v('address')} maxLength={200} error={e.address} autoComplete="street-address" />
        <TextAreaField name="description" label="About your business" hint="One or two sentences for your page in the UGNAYA app (up to 500 characters)." defaultValue={v('description')} maxLength={500} rows={4} error={e.description} />
        <div className="grid gap-5 md:grid-cols-2">
          <TextField name="contact_phone" label="Shop phone" type="tel" defaultValue={v('contact_phone')} maxLength={20} error={e.contact_phone} />
          <TextField name="website" label="Website or page" placeholder="kapenijuan.ph" defaultValue={v('website')} maxLength={200} error={e.website} inputMode="url" />
        </div>
      </fieldset>
      <fieldset disabled={readOnly} className="space-y-5">
        <legend className="font-sans text-lg font-semibold">For UGNAYA only</legend>
        <div className="grid gap-5 md:grid-cols-2">
          <TextField name="legal_name" label="Registered business name" hint={nameLocked ? 'Fixed once UGNAYA reviews your business.' : 'As on your business registration.'} defaultValue={v('legal_name')} maxLength={120} error={e.legal_name} readOnly={nameLocked} />
          <TextField name="contact_email" label="Business email" type="email" defaultValue={v('contact_email')} maxLength={120} error={e.contact_email} autoComplete="email" />
        </div>
        <TextField name="owner_mobile" label="Owner’s mobile" type="tel" inputMode="tel" placeholder="0917 123 4567" hint="How we reach you about your account." defaultValue={v('owner_mobile')} error={e.owner_mobile} autoComplete="tel" />
      </fieldset>
      {!readOnly && <SubmitButton pendingLabel="Saving…" className="sm:w-auto">Save profile</SubmitButton>}
    </form>
  );
}
