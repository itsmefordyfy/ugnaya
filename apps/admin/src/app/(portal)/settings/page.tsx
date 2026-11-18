import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Badge, Icon, Skeleton } from '@ugnaya/web-ui';
import { saveAnnouncement, savePlan, saveSetting } from '@/actions/settings';
import { ActionDialog } from '@/components/action-dialog';
import { DataTable } from '@/components/data-table';
import { CheckboxField, InputField, ReasonField, SelectField, TextAreaField } from '@/components/fields';
import { LocalDateTimeInput } from '@/components/local-datetime-input';
import { LocalTime } from '@/components/local-time';
import { PageHeader, Section } from '@/components/page-header';
import { RpcProblem } from '@/components/rpc-problem';
import { requireAdmin } from '@/lib/admin';
import { formatCount, formatPeso } from '@/lib/format';
import { CATEGORY, PLAN_LABEL } from '@/lib/labels';
import { callAdmin } from '@/lib/rpc';
import { INTEGER_SETTINGS } from '@/lib/settings';
import { createClient } from '@/lib/supabase/server';
import type { Announcement, Setting } from '@/lib/types';

export const metadata: Metadata = { title: 'Platform settings' };

export default function SettingsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <Content />
    </Suspense>
  );
}

const AUDIENCE: Record<string, string> = { merchants: 'Businesses', customers: 'Customers', all: 'Everyone' };
const limitText = (n: number | null) => (n === null ? 'Unlimited' : formatCount(n));

async function Content() {
  await requireAdmin('settings.manage');
  const supabase = await createClient();
  const [settings, plans, announcements] = await Promise.all([
    callAdmin<Setting[]>('admin_settings'),
    supabase.from('plan_limits').select('*').order('price_centavos'),
    callAdmin<Announcement[]>('admin_list_announcements'),
  ]);
  const value = (key: string) => (settings.ok ? settings.data.find((s) => s.key === key) : undefined);
  const network = value('network_enabled');

  return (
    <>
      <PageHeader title="Platform settings" description="Rules that apply to every business and customer. Every change needs a reason and is recorded in the audit log." />
    <div className="space-y-6">
      <Section title="Rules" description="Bounds are enforced by the database.">
        {!settings.ok ? <RpcProblem failure={settings} what="settings" /> : (
          <ul className="divide-y divide-divider">
            <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">Network points</p>
                <p className="text-sm text-ink-muted">Customers earn and spend a shared balance across participating businesses.</p>
                <p className="mt-1 text-sm">{network?.value === true ? <Badge tone="success" icon="check_circle">On</Badge> : <Badge icon="pause_circle">Off</Badge>}
                  {network && <span className="ml-2 text-xs text-ink-muted">changed <LocalTime iso={network.updated_at} /></span>}</p>
              </div>
              <ActionDialog action={saveSetting} hidden={{ key: 'network_enabled', value: network?.value === true ? 'false' : 'true' }}
                triggerLabel={network?.value === true ? 'Turn off' : 'Turn on'} triggerVariant={network?.value === true ? 'danger' : 'primary'} danger={network?.value === true}
                title={network?.value === true ? 'Turn network points off?' : 'Turn network points on?'}
                description={network?.value === true ? 'New network points stop being earned. Existing balances stay.' : 'Participating businesses start issuing network points with every award.'}
                submitLabel="Save" pendingLabel="Saving…" successMessage="Setting saved"><ReasonField /></ActionDialog>
            </li>
            {INTEGER_SETTINGS.map((spec) => {
              const current = value(spec.key);
              return (
                <li key={spec.key} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{spec.label}</p>
                    <p className="text-sm text-ink-muted">{spec.help} Allowed: {spec.min}–{spec.max} {spec.unit}.</p>
                    <p className="tabular mt-1 text-sm font-semibold">{current ? `${String(current.value)} ${spec.unit}` : 'Not set'}
                      {current && <span className="ml-2 text-xs font-normal text-ink-muted">changed <LocalTime iso={current.updated_at} /></span>}</p>
                  </div>
                  <ActionDialog action={saveSetting} hidden={{ key: spec.key }} triggerLabel="Change" triggerIcon="edit"
                    title={`Change ${spec.label.toLowerCase()}`} description={spec.help} submitLabel="Save" pendingLabel="Saving…" successMessage="Setting saved">
                    <InputField name="value" label={`Value (${spec.unit})`} type="number" required step={1} min={spec.min} max={spec.max}
                      defaultValue={current ? String(current.value) : undefined} inputMode="numeric" />
                    <ReasonField />
                  </ActionDialog>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section title="Plans" description="Monthly list prices and limits. Limits are recorded, not yet enforced. The marketing site’s price list is updated separately.">
        {plans.error ? <p className="text-sm text-danger-text">Couldn’t load plans: {plans.error.message}</p> : (
          <DataTable caption="Plans" rows={plans.data} rowKey={(p) => p.plan} empty={<p className="p-4 text-sm text-ink-muted">No plans.</p>}
            columns={[
              { header: 'Plan', primary: true, cell: (p) => PLAN_LABEL[p.plan] ?? p.plan },
              { header: 'Price / month', align: 'right', cell: (p) => <span className="tabular">{formatPeso(p.price_centavos)}</span> },
              { header: 'Branches', align: 'right', cell: (p) => limitText(p.branches) },
              { header: 'Staff', align: 'right', cell: (p) => limitText(p.staff) },
              { header: 'Rewards', align: 'right', cell: (p) => limitText(p.rewards) },
              { header: 'Txns / month', align: 'right', cell: (p) => limitText(p.transactions_per_month) },
              { header: 'Edit', cell: (p) => (
                <ActionDialog action={savePlan} hidden={{ plan: p.plan }} triggerVariant="link" triggerLabel="Edit"
                  title={`Edit the ${PLAN_LABEL[p.plan] ?? p.plan} plan`} description="Applies to every business on this plan; list-price MRR changes with it."
                  submitLabel="Save plan" pendingLabel="Saving…" successMessage="Plan saved">
                  <InputField name="price" label="Monthly list price (₱)" required inputMode="decimal" defaultValue={(p.price_centavos / 100).toFixed(2)} />
                  <div className="grid grid-cols-2 gap-3">
                    <InputField name="branches" label="Branches" type="number" min={1} defaultValue={p.branches ?? ''} placeholder="Unlimited" />
                    <InputField name="staff" label="Staff" type="number" min={1} defaultValue={p.staff ?? ''} placeholder="Unlimited" />
                    <InputField name="rewards" label="Rewards" type="number" min={1} defaultValue={p.rewards ?? ''} placeholder="Unlimited" />
                    <InputField name="transactions" label="Txns / month" type="number" min={1} defaultValue={p.transactions_per_month ?? ''} placeholder="Unlimited" />
                  </div>
                  <p className="text-xs text-ink-muted">Leave a limit blank for unlimited.</p>
                  <ReasonField />
                </ActionDialog>
              ) },
            ]} />
        )}
      </Section>

      <Section title="Announcements" description="Messages shown in the merchant portal and the customer app while published and within their dates."
        actions={<AnnouncementDialog />}>
        {!announcements.ok ? <RpcProblem failure={announcements} what="announcements" /> : announcements.data.length === 0 ? (
          <p className="text-sm text-ink-muted">No announcements yet.</p>
        ) : (
          <ul className="divide-y divide-divider">
            {announcements.data.map((a) => (
              <li key={a.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-medium">{a.title}
                    {a.published ? <Badge tone="success" icon="check_circle">Published</Badge> : <Badge icon="edit">Draft</Badge>}
                    <Badge tone="info">{AUDIENCE[a.audience] ?? a.audience}</Badge></p>
                  <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-sm text-ink-muted">{a.body}</p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {a.starts_at ? <>From <LocalTime iso={a.starts_at} /></> : 'From publishing'}{' · '}{a.ends_at ? <>until <LocalTime iso={a.ends_at} /></> : 'no end date'}
                  </p>
                </div>
                <AnnouncementDialog announcement={a} />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Merchant categories">
        <p className="flex items-start gap-2 text-sm text-ink-muted"><Icon name="lock" size={18} className="mt-0.5 shrink-0" />
          Categories are a fixed list in the database: {Object.values(CATEGORY).join(', ')}. Changing categories requires a database migration.</p>
      </Section>
    </div>
    </>
  );
}

function AnnouncementDialog({ announcement: a }: { announcement?: Announcement }) {
  return (
    <ActionDialog action={saveAnnouncement} hidden={a ? { id: a.id } : undefined} triggerVariant={a ? 'link' : 'primary'} triggerIcon={a ? undefined : 'add'}
      triggerLabel={a ? 'Edit' : 'New announcement'} title={a ? 'Edit announcement' : 'New announcement'}
      description="Times are in your time zone." submitLabel={a ? 'Save announcement' : 'Create announcement'} pendingLabel="Saving…"
      successMessage={a ? 'Announcement saved' : 'Announcement created'}>
      <InputField name="title" label="Title" required maxLength={120} defaultValue={a?.title} />
      <TextAreaField name="body" label="Message" required maxLength={2000} defaultValue={a?.body} />
      <SelectField name="audience" label="Who sees it" defaultValue={a?.audience ?? 'merchants'}
        options={[{ value: 'merchants', label: 'Businesses' }, { value: 'customers', label: 'Customers' }, { value: 'all', label: 'Everyone' }]} />
      <div className="grid gap-3 sm:grid-cols-2">
        <LocalDateTimeInput name="startsAt" label="Starts (optional)" iso={a?.starts_at} withOffset />
        <LocalDateTimeInput name="endsAt" label="Ends (optional)" iso={a?.ends_at} />
      </div>
      <CheckboxField name="published" label="Published" defaultChecked={a?.published ?? false} hint="Unpublished announcements are drafts nobody else sees." />
    </ActionDialog>
  );
}
