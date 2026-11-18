import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { Badge, EmptyState, Icon, Skeleton, buttonClasses } from '@ugnaya/web-ui';
import { updateSubscription } from '@/actions/subscriptions';
import { ActionDialog } from '@/components/action-dialog';
import { DataTable } from '@/components/data-table';
import { CheckboxField, ReasonField, SelectField } from '@/components/fields';
import { FilterBar, Pagination, SelectFilter } from '@/components/list-controls';
import { LocalTime } from '@/components/local-time';
import { PageHeader } from '@/components/page-header';
import { RpcProblem } from '@/components/rpc-problem';
import { StatusBadge } from '@/components/status-badge';
import { requireAdmin } from '@/lib/admin';
import { formatPeso } from '@/lib/format';
import { MERCHANT_STATUS, PLANS, PLAN_LABEL, SUBSCRIPTION_STATUS, statusLook } from '@/lib/labels';
import { PAGE_SIZE, hrefWith, oneOf, pageOffset, param, parsePage } from '@/lib/paging';
import { callAdmin } from '@/lib/rpc';
import type { Paged, SubscriptionRow } from '@/lib/types';

export const metadata: Metadata = { title: 'Subscriptions' };

export default function SubscriptionsPage({ searchParams }: PageProps<'/subscriptions'>) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: Pick<PageProps<'/subscriptions'>, 'searchParams'>) {
  const admin = await requireAdmin('subscriptions.view');
  const can = (p: string) => admin.permissions.includes(p);
  const params = await searchParams;
  const plan = oneOf(param(params, 'plan'), ['', ...PLANS], '');
  const q = param(params, 'q');
  const page = parsePage(param(params, 'page'));
  const current = { plan, q };
  const list = await callAdmin<Paged<SubscriptionRow>>('admin_list_subscriptions', { p_plan: plan || undefined, p_search: q || undefined, p_limit: PAGE_SIZE, p_offset: pageOffset(page) });

  return (
    <>
      <PageHeader title="Subscriptions" description="Each business’s plan, by name. Changing a plan here changes the record only: no payment is taken or refunded (no payment provider is connected)."
        actions={(can('reports.export') || can('finance.export')) && (
          <a href={hrefWith('/export/subscriptions', current)} className={buttonClasses('secondary')} download><Icon name="download" size={18} />Export CSV</a>
        )} />
      <FilterBar path="/subscriptions" q={q} placeholder="Business name" clearHref="/subscriptions">
        <SelectFilter name="plan" label="Plan" value={plan} options={[{ value: '', label: 'All plans' }, ...PLANS.map((p) => ({ value: p, label: PLAN_LABEL[p] }))]} />
      </FilterBar>
      {!list.ok ? <RpcProblem failure={list} what="subscriptions" /> : (
        <>
          <DataTable caption="Subscriptions" rows={list.data.rows} rowKey={(s) => s.merchant_id}
            empty={<EmptyState title="No matching subscriptions" body="Every business gets a subscription record (Free) when it registers." />}
            columns={[
              { header: 'Business', primary: true, cell: (s) => <Link className="link font-medium" href={`/merchants/${s.merchant_id}`}>{s.trade_name}</Link> },
              { header: 'Business status', cell: (s) => <StatusBadge look={statusLook(MERCHANT_STATUS, s.merchant_status)} /> },
              { header: 'Plan', cell: (s) => <span className="flex flex-wrap items-center justify-end gap-1 md:justify-start">{PLAN_LABEL[s.plan] ?? s.plan}{s.founding && <Badge tone="reward">Founding</Badge>}</span> },
              { header: 'Status', cell: (s) => <StatusBadge look={statusLook(SUBSCRIPTION_STATUS, s.status)} /> },
              { header: 'List price', align: 'right', cell: (s) => <span className="tabular">{formatPeso(s.price_centavos)}</span> },
              { header: 'Founding until', cell: (s) => s.founding_until ?? '—' },
              { header: 'Updated', cell: (s) => <LocalTime iso={s.updated_at} mode="date" /> },
              ...(can('subscriptions.manage') ? [{ header: 'Edit', cell: (s: SubscriptionRow) => (
                <ActionDialog action={updateSubscription} hidden={{ merchantId: s.merchant_id }} triggerVariant="link" triggerLabel="Edit"
                  title={`Edit ${s.trade_name}’s subscription`} description="Recorded in the audit log. No payment is taken or refunded."
                  submitLabel="Save subscription" pendingLabel="Saving…" successMessage="Subscription updated">
                  <SelectField name="plan" label="Plan" defaultValue={s.plan} options={PLANS.map((p) => ({ value: p, label: PLAN_LABEL[p] }))} />
                  <SelectField name="status" label="Status" defaultValue={['active', 'paused', 'cancelled'].includes(s.status) ? s.status : 'active'}
                    options={[{ value: 'active', label: 'Active' }, { value: 'paused', label: 'Paused' }, { value: 'cancelled', label: 'Cancelled' }]} />
                  <CheckboxField name="founding" label="Founding merchant" defaultChecked={s.founding} hint="Founding terms last 12 months from today unless already set." />
                  <ReasonField />
                </ActionDialog>
              ) }] : []),
            ]} />
          <Pagination path="/subscriptions" params={current} page={page} total={list.data.total} size={PAGE_SIZE} />
        </>
      )}
    </>
  );
}
