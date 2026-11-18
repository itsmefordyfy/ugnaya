'use client';

import { useActionState, useState } from 'react';
import { FormMessage, SubmitButton, TextField } from '@ugnaya/web-ui';
import { useActionToast } from '@/components/action-toast';
import { CheckboxField, SelectField, controlClass } from '@/components/fields';
import type { ActionState } from '@/lib/action-state';
import { centavosToInput, parsePesos } from '@/lib/format';
import { describeExample, describeExpiry, describeRule, EXPIRY_OPTIONS, RULE_TYPES, type RuleType } from '@/lib/loyalty';
import { saveProgram } from '../actions';

export type ProgramFormProps = {
  program: {
    name: string;
    ruleType: RuleType;
    pointsPerUnit: number;
    unitCentavos: number;
    minimumSpendCentavos: number;
    expiryMonths: number | null;
    active: boolean;
  };
};

const whole = (value: string, fallback: number) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
};

/** The owner's editor, with the rule and a sample purchase explained live as they type. */
export function ProgramForm({ program }: ProgramFormProps) {
  const [state, action] = useActionState<ActionState, FormData>(saveProgram, {});
  useActionToast(state);
  const errors = state.fieldErrors ?? {};

  const [ruleType, setRuleType] = useState<RuleType>(program.ruleType);
  const [points, setPoints] = useState(String(program.pointsPerUnit));
  const [unit, setUnit] = useState(centavosToInput(program.unitCentavos));
  const [minimum, setMinimum] = useState(program.minimumSpendCentavos > 0 ? centavosToInput(program.minimumSpendCentavos) : '');
  const [expiry, setExpiry] = useState(program.expiryMonths === null ? 'never' : String(program.expiryMonths));
  const [sample, setSample] = useState('250');

  const live = {
    ruleType,
    pointsPerUnit: whole(points, 0),
    unitCentavos: parsePesos(unit) ?? 0,
    minimumSpendCentavos: parsePesos(minimum) ?? 0,
  };
  const sampleCentavos = parsePesos(sample);
  const expiryMonths = expiry === 'never' ? null : Number(expiry);
  // Keep a stored value the list doesn't offer (e.g. 7 months) selectable.
  const expiryOptions = EXPIRY_OPTIONS.some((o) => o.value === expiry) ? EXPIRY_OPTIONS : [...EXPIRY_OPTIONS, { value: expiry, label: `${expiry} months without a visit` }];

  return (
    <form action={action} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]" noValidate>
      <div className="space-y-6">
        <FormMessage message={state.error} />
        <TextField name="name" label="Program name" hint="Customers see this in the app, next to their points." defaultValue={program.name} required maxLength={80} error={errors.name} />

        <fieldset>
          <legend className="text-sm font-medium">How customers earn</legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            {RULE_TYPES.map((r) => (
              <label key={r.value} className={`flex min-h-11 cursor-pointer flex-col gap-1 rounded-md border p-4 ${ruleType === r.value ? 'border-primary bg-primary-soft' : 'border-border-strong bg-card hover:border-primary'}`}>
                <span className="flex items-center gap-2 font-semibold">
                  <input type="radio" name="ruleType" value={r.value} checked={ruleType === r.value} onChange={() => setRuleType(r.value)} className="size-5 accent-[var(--color-primary)]" />
                  {r.label}
                </span>
                <span className="text-sm text-ink-muted">{r.explain}</span>
              </label>
            ))}
          </div>
          {errors.ruleType && <p className="mt-1 text-sm text-danger">{errors.ruleType}</p>}
        </fieldset>

        {ruleType !== 'stamps' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField name="pointsPerUnit" label={ruleType === 'per_peso' ? 'Points' : 'Points per visit'} type="number" inputMode="numeric" min={1} step={1}
              value={points} onChange={(e) => setPoints(e.target.value)} error={errors.pointsPerUnit} className="tabular" />
            {ruleType === 'per_peso' && (
              <TextField name="unitPesos" label="For every (₱)" hint="The amount that earns those points." inputMode="decimal"
                value={unit} onChange={(e) => setUnit(e.target.value)} error={errors.unitCentavos} />
            )}
          </div>
        )}

        <TextField name="minimumSpendPesos" label="Minimum purchase (₱, optional)" hint="Purchases below this earn nothing. Leave empty for no minimum."
          inputMode="decimal" value={minimum} onChange={(e) => setMinimum(e.target.value)} error={errors.minimumSpendCentavos} />

        <SelectField name="expiryMonths" label="Points expire" hint="Unused points expire when a customer hasn’t earned or redeemed here for this long. Each visit resets the clock."
          options={expiryOptions} value={expiry} onChange={(e) => setExpiry(e.target.value)} error={errors.expiryMonths} />

        <div className="rounded-md border border-border p-4">
          <CheckboxField name="active" label="Program is on" defaultChecked={program.active}
            hint="When it’s off, the counter can’t award points (customers keep what they have). UGNAYA switches it on when your business is approved." />
        </div>

        <p className="text-sm text-ink-muted">
          Changing how customers earn starts a new version of your program. Points already earned stay exactly as they are; new purchases follow the new rule.
        </p>
        <SubmitButton pendingLabel="Saving…" className="sm:w-auto">Save program</SubmitButton>
      </div>

      <aside aria-live="polite" className="h-fit space-y-4 rounded-lg border border-border bg-surface p-5 lg:sticky lg:top-6">
        <h2 className="font-sans text-lg font-semibold">In plain words</h2>
        <p>{describeRule(live)}</p>
        <p className="text-ink-muted">{describeExpiry(expiryMonths)}</p>
        <div className="border-t border-divider pt-4">
          <label htmlFor="sample" className="block text-sm font-medium">Try a purchase (₱)</label>
          <input id="sample" inputMode="decimal" value={sample} onChange={(e) => setSample(e.target.value)} className={`${controlClass} tabular`} />
          <p className="mt-3 font-semibold">{sampleCentavos === null ? 'Enter an amount in pesos.' : describeExample(live, sampleCentavos)}</p>
        </div>
      </aside>
    </form>
  );
}
