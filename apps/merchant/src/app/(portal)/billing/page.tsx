import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Badge, Icon, Skeleton } from '@ugnaya/web-ui';
import { DataError } from '@/components/data-error';
import { PageHeader, Panel } from '@/components/page-header';
import { requireStaff } from '@/lib/auth/guard';
import { FOUNDING, PLAN_NAMES, SUBSCRIPTION_STATUS, foundingPrice, manilaMonthStart, usageShare, usageText } from '@/lib/billing';
import { friendlyError } from '@/lib/errors';
import { formatDate, formatPesos } from '@/lib/format';
import { CONTACT_EMAIL } from '@/lib/site';
import { createClient } from '@/lib/supabase/server';
import { MARKETING_LINKS } from '@/lib/urls';

export const metadata: Metadata = { title: 'Plan & billing' };

export default function BillingPage() {
  return (
    <>
      <PageHeader title="Plan & billing" description="Your plan, what it includes, and how much of it you use." />
      <Suspense fallback={<BillingSkeleton />}>
        <Billing />
      </Suspense>
    </>
  );
}

async function Billing() {
  const ctx = await requireStaff('billing');
  const supabase = await createClient();
  const id = ctx.merchant.id;
  const [subscription, plans, branches, staff, rewards, transactions] = await Promise.all([
    supabase.from('subscriptions').select('plan, status, period_start, period_end, founding, founding_until, created_at').eq('merchant_id', id).maybeSingle(),
    supabase.from('plan_limits').select('plan, price_centavos, branches, staff, rewards, transactions_per_month').order('price_centavos'),
    supabase.from('merchant_branches').select('id', { count: 'exact', head: true }).eq('merchant_id', id).eq('active', true),
    supabase.from('merchant_staff').select('id', { count: 'exact', head: true }).eq('merchant_id', id).eq('active', true),
    supabase.from('rewards').select('id', { count: 'exact', head: true }).eq('merchant_id', id).eq('active', true),
    supabase.from('loyalty_transactions').select('id', { count: 'exact', head: true }).eq('merchant_id', id).gte('created_at', manilaMonthStart()),
  ]);
  if (subscription.error) return <DataError message={friendlyError(subscription.error)} />;
  if (plans.error) return <DataError message={friendlyError(plans.error)} />;
  const sub = subscription.data;
  if (!sub) {
    return <DataError title="No plan on record" message={`We couldn’t find a plan for this business. Email ${CONTACT_EMAIL} and we’ll fix it.`} />;
  }
  const plan = plans.data.find((p) => p.plan === sub.plan) ?? null;
  const usage = [
    { label: 'Active branches', used: branches.count ?? 0, limit: plan?.branches },
    { label: 'Active staff', used: staff.count ?? 0, limit: plan?.staff },
    { label: 'Active rewards', used: rewards.count ?? 0, limit: plan?.rewards },
    { label: 'Transactions this month', used: transactions.count ?? 0, limit: plan?.transactions_per_month },
  ];
  const foundingActive = sub.founding && (!sub.founding_until || new Date(sub.founding_until) >= new Date());

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title="Your plan">
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-display text-3xl font-bold">{PLAN_NAMES[sub.plan] ?? sub.plan}</p>
            <Badge tone={sub.status === 'active' ? 'success' : 'info'} icon={sub.status === 'active' ? 'check_circle' : 'info'}>{SUBSCRIPTION_STATUS[sub.status] ?? sub.status}</Badge>
            {sub.founding && <Badge tone="points" icon="workspace_premium">Founding merchant</Badge>}
          </div>
          {plan && (
            <p className="mt-3 text-lg">
              <span className="tabular font-semibold">{plan.price_centavos === 0 ? 'Free' : `${formatPesos(plan.price_centavos, { whole: true })} a month`}</span>
              <span className="text-ink-muted"> list price</span>
              {foundingActive && plan.price_centavos > 0 && (
                <span className="block text-base text-ink-muted">
                  Founding price <strong className="tabular text-ink">{formatPesos(foundingPrice(plan.price_centavos))}</strong> a month ({FOUNDING.discountPercent}% off)
                  {sub.founding_until ? <> until {formatDate(sub.founding_until)}</> : null}.
                </span>
              )}
            </p>
          )}
          <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
            <div><dt className="text-ink-muted">On UGNAYA since</dt><dd className="font-medium">{formatDate(sub.created_at)}</dd></div>
            {sub.period_start && <div><dt className="text-ink-muted">Current period</dt><dd className="font-medium">{formatDate(sub.period_start)} – {formatDate(sub.period_end)}</dd></div>}
            {sub.founding && <div><dt className="text-ink-muted">Founding discount until</dt><dd className="font-medium">{formatDate(sub.founding_until)}</dd></div>}
          </dl>
        </Panel>

        <Panel title="Billing">
          <div className="flex gap-3">
            <Icon name="info" className="mt-0.5 shrink-0 text-info-text" />
            <div className="space-y-2">
              <p><strong>Online billing isn’t switched on yet.</strong> There are no invoices or payments in UGNAYA, and nothing is charged automatically.</p>
              <p className="text-ink-muted">
                {sub.founding ? `As a founding merchant you start with a ${FOUNDING.pilotDays}-day free pilot. ` : ''}
                We’ll agree any payment with you directly before it’s due. To change plans or ask about billing, email{' '}
                <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Plan for ${ctx.merchant.tradeName}`)}`} className="link font-semibold">{CONTACT_EMAIL}</a>.
              </p>
            </div>
          </div>
          <div className="mt-5 rounded-md border border-dashed border-border-strong p-4 text-sm text-ink-muted">
            <p className="font-medium text-ink">Invoices</p>
            <p>None yet. Invoices will appear here once online billing starts.</p>
          </div>
        </Panel>
      </div>

      <Panel title="What you use" description="Limits are recorded but not enforced while UGNAYA is in its pilot. We’ll talk to you before that changes.">
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {usage.map((u) => {
            const share = usageShare(u.used, u.limit);
            return (
              <li key={u.label}>
                <p className="text-sm text-ink-muted">{u.label}</p>
                <p className="mt-1 text-2xl font-extrabold tabular">{usageText(u.used, u.limit)}</p>
                {share !== null && (
                  <div className="mt-2 h-2 rounded-pill bg-divider" role="presentation">
                    <div className={`h-2 rounded-pill ${share >= 1 ? 'bg-danger' : share >= 0.8 ? 'bg-warning' : 'bg-primary'}`} style={{ width: `${Math.max(4, share * 100)}%` }} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel title="All plans" description={<>List prices. Details are on <a href={MARKETING_LINKS.pricing} className="link">ugnaya.com/pricing</a>.</>}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <caption className="sr-only">UGNAYA plans and their limits</caption>
            <thead className="text-ink-muted">
              <tr className="border-b border-divider">
                <th scope="col" className="py-3 pr-4 font-medium">Plan</th>
                <th scope="col" className="py-3 pr-4 text-right font-medium">Price a month</th>
                <th scope="col" className="py-3 pr-4 text-right font-medium">Branches</th>
                <th scope="col" className="py-3 pr-4 text-right font-medium">Staff</th>
                <th scope="col" className="py-3 pr-4 text-right font-medium">Rewards</th>
                <th scope="col" className="py-3 text-right font-medium">Transactions a month</th>
              </tr>
            </thead>
            <tbody className="tabular">
              {plans.data.map((p) => (
                <tr key={p.plan} className={`border-b border-divider ${p.plan === sub.plan ? 'bg-primary-soft font-semibold' : ''}`}>
                  <th scope="row" className="py-3 pr-4 font-medium">{PLAN_NAMES[p.plan] ?? p.plan}{p.plan === sub.plan && <span className="ml-2 text-xs text-primary">(yours)</span>}</th>
                  <td className="py-3 pr-4 text-right">{p.plan === 'enterprise' ? 'Custom' : p.price_centavos === 0 ? 'Free' : formatPesos(p.price_centavos, { whole: true })}</td>
                  <td className="py-3 pr-4 text-right">{p.branches ?? 'No limit'}</td>
                  <td className="py-3 pr-4 text-right">{p.staff ?? 'No limit'}</td>
                  <td className="py-3 pr-4 text-right">{p.rewards ?? 'No limit'}</td>
                  <td className="py-3 text-right">{p.transactions_per_month ?? 'No limit'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function BillingSkeleton() {
  return (
    <div role="status" aria-label="Loading your plan" className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2"><Skeleton className="h-56 w-full" /><Skeleton className="h-56 w-full" /></div>
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
