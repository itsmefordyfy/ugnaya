'use client';

import { useActionState, useState, useTransition } from 'react';
import { Badge, ConfirmDialog, Dialog, EmptyState, FormMessage, Icon, SubmitButton, TextField, buttonClasses, useToast } from '@ugnaya/web-ui';
import { useActionToast } from '@/components/action-toast';
import { CheckboxField, TextAreaField } from '@/components/fields';
import type { ActionState } from '@/lib/action-state';
import { centavosToInput, formatNumber, formatPesos, parsePesos } from '@/lib/format';
import { rewardState, valueBack, valueBackHint } from '@/lib/rewards';
import { saveReward, setRewardActive } from '../actions';

export type RewardRow = {
  id: string;
  name: string;
  description: string | null;
  points_cost: number;
  retail_value_centavos: number | null;
  monthly_cap: number | null;
  stock: number | null;
  first_visit_only: boolean;
  active: boolean;
};
export type ProgramRule = { ruleType: string; pointsPerUnit: number; unitCentavos: number; unitWord: string };

export function RewardsManager({ rewards, program }: { rewards: RewardRow[]; program: ProgramRule }) {
  const [editing, setEditing] = useState<RewardRow | 'new' | null>(null);
  const [turningOff, setTurningOff] = useState<RewardRow | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [pending, start] = useTransition();
  const toast = useToast();

  const open = (r: RewardRow | 'new') => {
    setFormKey((k) => k + 1);
    setEditing(r);
  };
  const toggle = (r: RewardRow, active: boolean) =>
    start(async () => {
      const result = await setRewardActive(r.id, active);
      toast.show(result.ok ? { tone: 'success', title: result.message ?? 'Saved' } : { tone: 'error', title: result.error ?? 'Something went wrong.' });
    });

  return (
    <>
      <div className="mb-6 flex justify-end">
        <button type="button" onClick={() => open('new')} className={buttonClasses('primary')}>
          <Icon name="add" size={20} />Add reward
        </button>
      </div>

      {rewards.length === 0 ? (
        <div className="rounded-lg border border-border bg-card">
          <EmptyState title="No rewards yet" body="Rewards are what customers spend their points on, like a free drink or a slice of cake. Add your first one."
            action={<button type="button" onClick={() => open('new')} className={buttonClasses('primary')}>Add reward</button>} />
        </div>
      ) : (
        <ul className="divide-y divide-divider rounded-lg border border-border bg-card">
          {rewards.map((r) => {
            const state = rewardState(r);
            return (
              <li key={r.id} className="flex flex-col gap-4 p-5 sm:p-6 md:flex-row md:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-sans text-lg font-semibold">{r.name}</h3>
                    {state === 'live' && <Badge tone="success" icon="check_circle">On</Badge>}
                    {state === 'off' && <Badge icon="pause_circle">Off</Badge>}
                    {state === 'out_of_stock' && <Badge tone="warning" icon="warning">Out of stock</Badge>}
                    {r.first_visit_only && <Badge tone="accent" icon="fiber_new">First visit only</Badge>}
                  </div>
                  {r.description && <p className="mt-1 text-sm text-ink-muted">{r.description}</p>}
                  <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                    <div className="flex gap-1"><dt className="text-ink-muted">Value</dt><dd className="tabular">{r.retail_value_centavos !== null ? formatPesos(r.retail_value_centavos) : '—'}</dd></div>
                    <div className="flex gap-1"><dt className="text-ink-muted">Stock</dt><dd className="tabular">{r.stock === null ? 'No limit' : formatNumber(r.stock)}</dd></div>
                    <div className="flex gap-1"><dt className="text-ink-muted">Monthly limit</dt><dd className="tabular">{r.monthly_cap === null ? 'None' : formatNumber(r.monthly_cap)}</dd></div>
                  </dl>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-3 md:justify-end">
                  <span className="inline-flex items-center rounded-pill bg-points px-3 py-1 text-sm font-bold text-on-points tabular">
                    {formatNumber(r.points_cost)} {program.unitWord}
                  </span>
                  <button type="button" onClick={() => open(r)} className={buttonClasses('secondary')}>
                    <Icon name="edit" size={20} />Edit
                  </button>
                  {r.active ? (
                    <button type="button" disabled={pending} onClick={() => setTurningOff(r)} className={`${buttonClasses('ghost')} disabled:opacity-60`}>Turn off</button>
                  ) : (
                    <button type="button" disabled={pending} onClick={() => toggle(r, true)} className={`${buttonClasses('ghost')} disabled:opacity-60`}>Turn on</button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'Add a reward' : 'Edit reward'}
        description="Customers see the name, description and points cost in the UGNAYA app.">
        {editing !== null && (
          <RewardForm key={formKey} reward={editing === 'new' ? null : editing} program={program} onSaved={() => setEditing(null)} />
        )}
      </Dialog>

      <ConfirmDialog
        open={turningOff !== null}
        onClose={() => setTurningOff(null)}
        onConfirm={() => turningOff && toggle(turningOff, false)}
        title={`Turn off ${turningOff?.name ?? 'this reward'}?`}
        description="Customers won’t see it or be able to claim it. Vouchers already claimed can still be used until they expire. Rewards are never deleted, so you can turn it back on any time."
        confirmLabel="Turn off"
      />
    </>
  );
}

function RewardForm({ reward, program, onSaved }: { reward: RewardRow | null; program: ProgramRule; onSaved: () => void }) {
  const [state, action] = useActionState<ActionState, FormData>(saveReward, {});
  useActionToast(state, onSaved);
  const errors = state.fieldErrors ?? {};
  const [points, setPoints] = useState(reward ? String(reward.points_cost) : '');
  const [value, setValue] = useState(reward ? centavosToInput(reward.retail_value_centavos) : '');
  const pointsNumber = Number(points.replace(/,/g, ''));
  const hint = Number.isInteger(pointsNumber) && pointsNumber > 0
    ? valueBackHint(valueBack({ pointsCost: pointsNumber, retailValueCentavos: parsePesos(value) }, program))
    : null;

  return (
    <form action={action} className="space-y-4" noValidate>
      {reward && <input type="hidden" name="id" value={reward.id} />}
      <FormMessage message={state.error} />
      <TextField name="name" label="Name" required maxLength={80} defaultValue={reward?.name} error={errors.name} />
      <TextAreaField name="description" label="Description (optional)" rows={2} maxLength={300} defaultValue={reward?.description ?? ''} error={errors.description} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="pointsCost" label={`Cost in ${program.unitWord}`} inputMode="numeric" required value={points} onChange={(e) => setPoints(e.target.value)} error={errors.pointsCost} />
        <TextField name="retailValuePesos" label="Menu price (₱, optional)" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} error={errors.retailValueCentavos} />
      </div>
      {hint && <p aria-live="polite" className="rounded-md bg-primary-soft p-3 text-sm">{hint}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="stock" label="Stock (optional)" hint="Empty if it never runs out." inputMode="numeric" defaultValue={reward?.stock ?? ''} error={errors.stock} />
        <TextField name="monthlyCap" label="Monthly limit (optional)" hint="Most claims per calendar month." inputMode="numeric" defaultValue={reward?.monthly_cap ?? ''} error={errors.monthlyCap} />
      </div>
      <CheckboxField name="firstVisitOnly" label="First visit only" hint="Only for a customer’s first purchase here, like a welcome gift." defaultChecked={reward?.first_visit_only ?? false} />
      <CheckboxField name="active" label="On (customers can see and claim it)" defaultChecked={reward?.active ?? true} />
      <SubmitButton pendingLabel="Saving…">{reward ? 'Save reward' : 'Add reward'}</SubmitButton>
    </form>
  );
}
