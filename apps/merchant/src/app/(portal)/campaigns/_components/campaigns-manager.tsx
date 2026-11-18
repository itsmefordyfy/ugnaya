'use client';

import { useActionState, useState, useTransition } from 'react';
import { Badge, ConfirmDialog, Dialog, EmptyState, FormMessage, Icon, SubmitButton, TextField, buttonClasses, useToast } from '@ugnaya/web-ui';
import { useActionToast } from '@/components/action-toast';
import { SelectField, TextAreaField } from '@/components/fields';
import type { ActionState } from '@/lib/action-state';
import { CAMPAIGN_KINDS, CAMPAIGN_STATUSES, kindLabel, statusInfo, visibleToCustomers } from '@/lib/campaigns';
import { formatDateTime, toManilaInput } from '@/lib/format';
import { cancelCampaign, saveCampaign } from '../actions';

export type CampaignRow = {
  id: string;
  name: string;
  kind: string;
  description: string | null;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
};

export function CampaignsManager({ campaigns, emptyTitle, emptyBody }: { campaigns: CampaignRow[]; emptyTitle: string; emptyBody: string }) {
  const [editing, setEditing] = useState<CampaignRow | 'new' | null>(null);
  const [cancelling, setCancelling] = useState<CampaignRow | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [pending, start] = useTransition();
  const toast = useToast();
  // Read once per render on the client; the list is re-rendered after every change.
  const [now] = useState(() => new Date());

  const open = (c: CampaignRow | 'new') => {
    setFormKey((k) => k + 1);
    setEditing(c);
  };
  const cancel = (c: CampaignRow) =>
    start(async () => {
      const result = await cancelCampaign(c.id);
      toast.show(result.ok ? { tone: 'success', title: result.message ?? 'Cancelled' } : { tone: 'error', title: result.error ?? 'Something went wrong.' });
    });

  return (
    <>
      <div className="mb-4 flex justify-end">
        <button type="button" onClick={() => open('new')} className={buttonClasses('primary')}>
          <Icon name="add" size={20} />New campaign
        </button>
      </div>

      {campaigns.length === 0 ? (
        <div className="rounded-lg border border-border bg-card">
          <EmptyState title={emptyTitle} body={emptyBody}
            action={<button type="button" onClick={() => open('new')} className={buttonClasses('primary')}>New campaign</button>} />
        </div>
      ) : (
        <ul className="divide-y divide-divider rounded-lg border border-border bg-card">
          {campaigns.map((c) => {
            const status = statusInfo(c.status);
            const visible = visibleToCustomers(c, now);
            const closed = c.status === 'ended' || c.status === 'cancelled';
            return (
              <li key={c.id} className="flex flex-col gap-4 p-5 sm:p-6 md:flex-row md:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-sans text-lg font-semibold">{c.name}</h3>
                    <Badge tone={status.tone} icon={status.value === 'running' ? 'play_circle' : status.value === 'scheduled' ? 'schedule' : status.value === 'cancelled' ? 'cancel' : status.value === 'ended' ? 'task_alt' : 'edit'}>{status.label}</Badge>
                    <Badge>{kindLabel(c.kind)}</Badge>
                  </div>
                  {c.description && <p className="mt-1 text-sm text-ink-muted">{c.description}</p>}
                  <p className="mt-2 text-sm text-ink-muted tabular">
                    {c.starts_at ? `${formatDateTime(c.starts_at)}` : 'No start date'} – {c.ends_at ? formatDateTime(c.ends_at) : 'no end date'}
                  </p>
                  <p className={`mt-1 flex items-center gap-1.5 text-sm ${visible ? 'text-success-text' : 'text-ink-muted'}`}>
                    <Icon name={visible ? 'visibility' : 'visibility_off'} size={16} />
                    {visible ? 'Customers can see this in the UGNAYA app' : 'Not shown to customers'}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-3">
                  <button type="button" onClick={() => open(c)} className={buttonClasses('secondary')}>
                    <Icon name="edit" size={20} />Edit
                  </button>
                  {!closed && (
                    <button type="button" disabled={pending} onClick={() => setCancelling(c)} className={`${buttonClasses('ghost')} disabled:opacity-60`}>Cancel campaign</button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'New campaign' : 'Edit campaign'}
        description="Times are Philippine time. Drafts stay private until you schedule or run them.">
        {editing !== null && <CampaignForm key={formKey} campaign={editing === 'new' ? null : editing} onSaved={() => setEditing(null)} />}
      </Dialog>

      <ConfirmDialog
        open={cancelling !== null}
        onClose={() => setCancelling(null)}
        onConfirm={() => cancelling && cancel(cancelling)}
        title={`Cancel ${cancelling?.name ?? 'this campaign'}?`}
        description="Customers stop seeing it in the app. It stays in your list as cancelled; you can edit it and set it running again later."
        confirmLabel="Cancel campaign"
        cancelLabel="Keep it"
        danger
      />
    </>
  );
}

function CampaignForm({ campaign, onSaved }: { campaign: CampaignRow | null; onSaved: () => void }) {
  const [state, action] = useActionState<ActionState, FormData>(saveCampaign, {});
  useActionToast(state, onSaved);
  const errors = state.fieldErrors ?? {};
  const [status, setStatus] = useState(campaign?.status ?? 'draft');
  const [kind, setKind] = useState(campaign?.kind ?? 'promotion');

  return (
    <form action={action} className="space-y-4" noValidate>
      {campaign && <input type="hidden" name="id" value={campaign.id} />}
      <FormMessage message={state.error} />
      <TextField name="name" label="Title" required maxLength={80} defaultValue={campaign?.name} error={errors.name} />
      <SelectField name="kind" label="Type" options={CAMPAIGN_KINDS} value={kind} onChange={(e) => setKind(e.target.value)}
        hint={CAMPAIGN_KINDS.find((k) => k.value === kind)?.hint} error={errors.kind} />
      <TextAreaField name="description" label="What customers will read (optional)" rows={3} maxLength={500} defaultValue={campaign?.description ?? ''} error={errors.description} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="startsAt" label="Starts" type="datetime-local" defaultValue={toManilaInput(campaign?.starts_at)} error={errors.startsAt} />
        <TextField name="endsAt" label="Ends (optional)" type="datetime-local" defaultValue={toManilaInput(campaign?.ends_at)} error={errors.endsAt} />
      </div>
      <SelectField name="status" label="Status" options={CAMPAIGN_STATUSES} value={status} onChange={(e) => setStatus(e.target.value)}
        hint={statusInfo(status).customers} error={errors.status} />
      <SubmitButton pendingLabel="Saving…">{campaign ? 'Save campaign' : 'Create campaign'}</SubmitButton>
    </form>
  );
}
