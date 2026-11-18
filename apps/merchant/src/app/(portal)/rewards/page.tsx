import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Skeleton } from '@ugnaya/web-ui';
import { DataError } from '@/components/data-error';
import { LockedNotice } from '@/components/locked-notice';
import { PageHeader } from '@/components/page-header';
import { requireStaff } from '@/lib/auth/guard';
import { friendlyError } from '@/lib/errors';
import { createClient } from '@/lib/supabase/server';
import { RewardsManager } from './_components/rewards-manager';

export const metadata: Metadata = { title: 'Rewards' };

export default function RewardsPage() {
  return (
    <>
      <PageHeader title="Rewards" description="What customers can claim with the points they earn at your shop. Turned-off rewards stay here with their history." />
      <Suspense fallback={<RewardsSkeleton />}>
        <Rewards />
      </Suspense>
    </>
  );
}

function RewardsSkeleton() {
  return (
    <div role="status" aria-label="Loading rewards" className="space-y-3">
      <div className="flex justify-end"><Skeleton className="h-11 w-36 rounded-pill" /></div>
      {[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 w-full" />)}
    </div>
  );
}

async function Rewards() {
  const ctx = await requireStaff('rewards');
  if (ctx.locked) {
    return (
      <LockedNotice feature="Rewards" status={ctx.merchant.status}>
        Once you’re approved, you’ll add the rewards customers spend their points on, with stock and monthly limits.
      </LockedNotice>
    );
  }
  const supabase = await createClient();
  const [rewards, program] = await Promise.all([
    supabase
      .from('rewards')
      .select('id, name, description, points_cost, retail_value_centavos, monthly_cap, stock, first_visit_only, active')
      .eq('merchant_id', ctx.merchant.id)
      .order('active', { ascending: false })
      .order('points_cost', { ascending: true }),
    supabase.from('loyalty_programs').select('rule_type, points_per_unit, unit_centavos').eq('merchant_id', ctx.merchant.id).eq('scope', 'merchant').maybeSingle(),
  ]);
  if (rewards.error) return <DataError message={friendlyError(rewards.error)} />;
  if (program.error) return <DataError message={friendlyError(program.error)} />;

  const rule = program.data
    ? { ruleType: program.data.rule_type, pointsPerUnit: program.data.points_per_unit, unitCentavos: program.data.unit_centavos }
    : { ruleType: 'per_peso', pointsPerUnit: 1, unitCentavos: 1000 };
  return <RewardsManager rewards={rewards.data ?? []} program={{ ...rule, unitWord: rule.ruleType === 'stamps' ? 'stamps' : 'points' }} />;
}
