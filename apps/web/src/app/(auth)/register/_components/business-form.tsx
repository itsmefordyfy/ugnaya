'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { FormMessage } from '@/components/ui/form-message';
import { SubmitButton } from '@/components/ui/submit-button';
import { TextField } from '@/components/ui/text-field';
import { CATEGORIES, HEARD_FROM } from '@/lib/validation';
import { registerMerchant, type RegisterState } from '../actions';

const selectClass =
  'mt-2 block min-h-11 w-full rounded-md border border-border bg-card px-3 py-2 text-base text-ink outline-none focus:border-primary aria-invalid:border-danger';

export function BusinessForm() {
  const [state, action] = useActionState<RegisterState, FormData>(registerMerchant, {});
  const errors = state.errors ?? {};
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormMessage message={state.formError ?? (Object.keys(errors).length > 0 ? 'Please check the highlighted fields.' : undefined)} />
      <TextField name="tradeName" label="Business name" autoComplete="organization" required error={errors.tradeName} />
      <div>
        <label htmlFor="field-category" className="block text-sm font-medium">What kind of business?</label>
        <select id="field-category" name="category" required defaultValue="" className={selectClass}
          aria-invalid={errors.category ? true : undefined} aria-describedby={errors.category ? 'field-category-error' : undefined}>
          <option value="" disabled>Choose one</option>
          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        {errors.category && <p id="field-category-error" className="mt-1 text-sm text-danger">{errors.category}</p>}
      </div>
      <TextField name="city" label="City" defaultValue="Naga City" autoComplete="address-level2" required error={errors.city} />
      <TextField name="address" label="Address" hint="Street and barangay of your main branch." autoComplete="street-address" error={errors.address} />
      <TextField name="branchCount" label="Number of branches" type="number" inputMode="numeric" min={1} max={50} defaultValue={1} required error={errors.branchCount} />
      <TextField name="ownerMobile" label="Your mobile number" type="tel" inputMode="tel" autoComplete="tel" placeholder="0917 123 4567"
        hint="We’ll call or text to arrange your setup visit." required error={errors.ownerMobile} />
      <div>
        <label htmlFor="field-heardFrom" className="block text-sm font-medium">How did you hear about UGNAYA?</label>
        <select id="field-heardFrom" name="heardFrom" defaultValue="" className={selectClass}>
          <option value="">Prefer not to say</option>
          {HEARD_FROM.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
        </select>
      </div>
      <fieldset className="space-y-3">
        <legend className="sr-only">Agreements</legend>
        <label className="flex min-h-11 gap-3">
          <input type="checkbox" name="acceptTerms" className="mt-1 size-5 shrink-0 accent-[var(--color-primary)]"
            aria-invalid={errors.acceptTerms ? true : undefined} aria-describedby={errors.acceptTerms ? 'field-acceptTerms-error' : undefined} />
          <span className="text-sm">
            I agree to the{' '}
            <Link href="/merchant-terms" target="_blank" className="font-semibold text-primary hover:underline">Merchant Terms</Link> and the{' '}
            <Link href="/privacy" target="_blank" className="font-semibold text-primary hover:underline">Privacy Policy</Link>.
          </span>
        </label>
        {errors.acceptTerms && <p id="field-acceptTerms-error" className="text-sm text-danger">{errors.acceptTerms}</p>}
        <label className="flex min-h-11 gap-3">
          <input type="checkbox" name="marketingConsent" className="mt-1 size-5 shrink-0 accent-[var(--color-primary)]" />
          <span className="text-sm text-ink-muted">Email me updates and tips for my shop (optional).</span>
        </label>
      </fieldset>
      <SubmitButton pendingLabel="Registering…">Register my business</SubmitButton>
    </form>
  );
}
