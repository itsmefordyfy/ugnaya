import { reviewMerchant } from '@/actions/merchants';
import { ActionDialog } from '@/components/action-dialog';
import { CheckboxField, ReasonField, SelectField } from '@/components/fields';
import { PLANS, PLAN_LABEL } from '@/lib/labels';
import { formatPeso } from '@/lib/format';
import type { ReviewAction } from '@/lib/review';

type Props = { merchantId: string; name: string; actions: ReviewAction[]; plan: string | null; founding: boolean; prices: Record<string, number> };

/** Only the decisions the status and the role allow; each opens a confirmation that says exactly what happens. */
export function ReviewActions({ merchantId, name, actions, plan, founding, prices }: Props) {
  if (actions.length === 0) return null;
  const hidden = (action: ReviewAction) => ({ merchantId, action });
  const common = { action: reviewMerchant, pendingLabel: 'Saving…' };
  return (
    <>
      {actions.includes('approve') && (
        <ActionDialog {...common} hidden={hidden('approve')} triggerVariant="primary" triggerIcon="check_circle" triggerLabel="Approve"
          title={`Approve ${name}?`} description="The business goes live: its loyalty program turns on and its staff can award and redeem points. The owner sees the decision in the merchant portal."
          submitLabel="Approve business" successMessage="Business approved">
          <SelectField name="plan" label="Plan" defaultValue={plan ?? 'free'}
            options={PLANS.map((p) => ({ value: p, label: `${PLAN_LABEL[p]} · ${p === 'enterprise' ? 'custom' : `${formatPeso(prices[p])} a month (list)`}` }))} />
          <CheckboxField name="founding" defaultChecked={founding} label="Founding merchant"
            hint="Founding terms last 12 months from today unless already set. Discounts aren’t recorded, so MRR stays at list price." />
          <ReasonField label="Note for the record (optional)" required={false} />
        </ActionDialog>
      )}
      {actions.includes('start_review') && (
        <ActionDialog {...common} hidden={hidden('start_review')} triggerIcon="pending" triggerLabel="Start review"
          title={`Start reviewing ${name}?`} description="Marks the application as under review so other admins know someone has it. Nothing changes for the business."
          submitLabel="Start review" successMessage="Review started">
          <ReasonField label="Note for the record (optional)" required={false} />
        </ActionDialog>
      )}
      {actions.includes('request_info') && (
        <ActionDialog {...common} hidden={hidden('request_info')} triggerIcon="mail" triggerLabel="Request info"
          title={`Ask ${name} for more information`} description="The owner sees this message in the merchant portal and can add documents and answer. The application waits until they do."
          submitLabel="Send request" successMessage="Information requested">
          <ReasonField label="Message to the owner (required)" hint="Say exactly what is missing, e.g. “Please upload your current business permit.”" />
        </ActionDialog>
      )}
      {actions.includes('reject') && (
        <ActionDialog {...common} hidden={hidden('reject')} triggerVariant="danger" triggerIcon="cancel" triggerLabel="Reject" danger
          title={`Reject ${name}?`} description="The business can’t go live. The owner sees the reason. You can reopen the application later."
          submitLabel="Reject application" successMessage="Application rejected">
          <ReasonField label="Reason (required, shown to the owner)" />
        </ActionDialog>
      )}
      {actions.includes('reopen') && (
        <ActionDialog {...common} hidden={hidden('reopen')} triggerIcon="undo" triggerLabel="Reopen"
          title={`Reopen ${name}’s application?`} description="Moves it back to under review."
          submitLabel="Reopen application" successMessage="Application reopened">
          <ReasonField />
        </ActionDialog>
      )}
      {actions.includes('suspend') && (
        <ActionDialog {...common} hidden={hidden('suspend')} triggerVariant="danger" triggerIcon="block" triggerLabel="Suspend" danger
          title={`Suspend ${name}?`} description="Its staff can no longer award or redeem points until it is reactivated. Customers keep their balances."
          submitLabel="Suspend business" successMessage="Business suspended">
          <ReasonField />
        </ActionDialog>
      )}
      {actions.includes('reactivate') && (
        <ActionDialog {...common} hidden={hidden('reactivate')} triggerVariant="primary" triggerIcon="play_circle" triggerLabel="Reactivate"
          title={`Reactivate ${name}?`} description="Its staff can award and redeem points again."
          submitLabel="Reactivate business" successMessage="Business reactivated">
          <ReasonField />
        </ActionDialog>
      )}
    </>
  );
}
