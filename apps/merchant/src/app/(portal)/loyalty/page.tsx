import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Badge, EmptyState, Skeleton } from '@ugnaya/web-ui';
import { DataError } from '@/components/data-error';
import { PageHeader, Panel } from '@/components/page-header';
import { requireStaff } from '@/lib/auth/guard';
import { friendlyError } from '@/lib/errors';
import { formatDateTime, formatPesos } from '@/lib/format';
import { describeExpiry, describeRule, isRuleType, RULE_TYPES } from '@/lib/loyalty';
import { createClient } from '@/lib/supabase/server';
import { ProgramForm } from './_components/program-form';

export const metadata: Metadata = { title: 'Loyalty program' };

export default function LoyaltyPage() {
  return (
    <>
      <PageHeader title="Loyalty program" description="How your customers earn points at your shop, and when unused points expire." />
      <Suspense fallback={<ProgramSkeleton />}>
        <Program />
      </Suspense>
    </>
  );
}

function ProgramSkeleton() {
  return (
    <div role="status" aria-label="Loading your program" className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-6">
        <Skeleton className="h-16 w-full" />
        <div className="grid gap-3 sm:grid-cols-3"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

async function Program() {
  const ctx = await requireStaff('loyalty');
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('loyalty_programs')
    .select('name, rule_type, points_per_unit, unit_centavos, minimum_spend_centavos, expiry_months, active, version, updated_at')
    .eq('merchant_id', ctx.merchant.id)
    .eq('scope', 'merchant')
    .maybeSingle();
  if (error) return <DataError message={friendlyError(error)} />;
  if (!data || !isRuleType(data.rule_type)) {
    return (
      <Panel>
        <EmptyState title="No loyalty program yet" body="Every business gets a program when it registers. Contact UGNAYA and we’ll set yours up." />
      </Panel>
    );
  }

  const program = {
    name: data.name,
    ruleType: data.rule_type,
    pointsPerUnit: data.points_per_unit,
    unitCentavos: data.unit_centavos,
    minimumSpendCentavos: data.minimum_spend_centavos,
    expiryMonths: data.expiry_months,
    active: data.active,
  };
  const status = (
    <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-ink-muted">
      {data.active ? <Badge tone="success" icon="check_circle">On</Badge> : <Badge tone="warning" icon="pause_circle">Off</Badge>}
      <span className="tabular">Version {data.version}</span>
      <span>Last changed {formatDateTime(data.updated_at)}</span>
    </div>
  );

  if (ctx.role !== 'owner') {
    return (
      <>
        {status}
        <Panel title={program.name} description="Only the owner can change the program. Ask them if something should be different.">
          <dl className="grid gap-5 sm:grid-cols-2">
            <div><dt className="text-sm text-ink-muted">How customers earn</dt><dd className="mt-1 font-medium">{RULE_TYPES.find((r) => r.value === program.ruleType)?.label}</dd></div>
            <div><dt className="text-sm text-ink-muted">Minimum purchase</dt><dd className="mt-1 font-medium tabular">{program.minimumSpendCentavos > 0 ? formatPesos(program.minimumSpendCentavos, { whole: true }) : 'None'}</dd></div>
            <div className="sm:col-span-2"><dt className="text-sm text-ink-muted">In plain words</dt><dd className="mt-1">{describeRule(program)} {describeExpiry(program.expiryMonths)}</dd></div>
          </dl>
        </Panel>
      </>
    );
  }

  return (
    <>
      {status}
      <ProgramForm program={program} />
    </>
  );
}
