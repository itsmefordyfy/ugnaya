'use server';

import { refresh } from 'next/cache';
import { done, failed, type ActionState } from '@/lib/action-state';
import { actionContext } from '@/lib/auth/action';
import { friendlyError } from '@/lib/errors';
import { parseProgramForm } from '@/lib/loyalty';

/** The owner changes the earning rule. Row-level security lets only the owner update loyalty_programs. */
export async function saveProgram(_previous: ActionState, form: FormData): Promise<ActionState> {
  const { ctx, supabase } = await actionContext('loyalty');
  if (ctx.role !== 'owner') return failed('Only the owner can change the loyalty program.');

  const current = await supabase
    .from('loyalty_programs')
    .select('id, points_per_unit, unit_centavos')
    .eq('merchant_id', ctx.merchant.id)
    .eq('scope', 'merchant')
    .maybeSingle();
  if (current.error) return failed(friendlyError(current.error));
  if (!current.data) return failed('Your business has no loyalty program yet. Contact UGNAYA.');

  const parsed = parseProgramForm(form, { pointsPerUnit: current.data.points_per_unit, unitCentavos: current.data.unit_centavos });
  if (!parsed.ok) return failed('Please check the highlighted fields.', parsed.errors as Record<string, string>);
  const p = parsed.value;

  const { data, error } = await supabase
    .from('loyalty_programs')
    .update({
      name: p.name,
      rule_type: p.ruleType,
      points_per_unit: p.pointsPerUnit,
      unit_centavos: p.unitCentavos,
      minimum_spend_centavos: p.minimumSpendCentavos,
      expiry_months: p.expiryMonths,
      active: p.active,
    })
    .eq('id', current.data.id)
    .eq('merchant_id', ctx.merchant.id)
    .select('id');
  if (error) return failed(friendlyError(error));
  // Row-level security hides rows it won't let you change: no row back means the database refused.
  if (!data || data.length === 0) return failed('Only the owner can change the loyalty program.');
  refresh();
  return done('Loyalty program saved');
}
