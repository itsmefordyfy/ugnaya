'use client';

import { useActionState, useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon, buttonClasses, type IconName } from '@ugnaya/web-ui';
import { looksLikeMemberCode, looksLikeVoucherCode, type CounterOutcome } from '@/lib/counter';
import { formatDate, formatNumber, formatPoints } from '@/lib/format';
import { awardPoints, redeemVoucher, type CounterState } from '../actions';
import { CameraScan } from './camera-scan';

export type CounterDeskProps = { branchId: string };

/** Award on the left, redeem on the right from 768 px (a tablet in either orientation); stacked on a phone. */
export function CounterDesk({ branchId }: CounterDeskProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <AwardPane branchId={branchId} />
      <RedeemPane branchId={branchId} />
    </div>
  );
}

/**
 * One idempotency key per submission. It is made when the form mounts, kept (also in sessionStorage, so a reload or a
 * lost connection mid-request still reuses it) until a result has been shown and the cashier taps "Next customer",
 * and only then replaced. The database answers a repeated key with the first result, so nothing is awarded twice.
 */
function useIdempotencyKey(storageKey: string) {
  const key = useRef<string | null>(null);
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.sessionStorage.getItem(storageKey);
    } catch {
      // Storage can be blocked (private mode); the in-memory key still covers double taps.
    }
    key.current = stored ?? crypto.randomUUID();
  }, [storageKey]);

  const current = () => {
    key.current ??= crypto.randomUUID();
    try {
      window.sessionStorage.setItem(storageKey, key.current);
    } catch {
      // See above.
    }
    return key.current;
  };
  const renew = () => {
    key.current = crypto.randomUUID();
    try {
      window.sessionStorage.removeItem(storageKey);
    } catch {
      // See above.
    }
  };
  /** Once an answer has arrived the request can't be retried any more, so a reload need not reuse this key. */
  const settle = () => {
    try {
      window.sessionStorage.removeItem(storageKey);
    } catch {
      // See above.
    }
  };
  return { current, renew, settle };
}

const inputClass =
  'mt-2 block min-h-14 w-full rounded-md border border-border-strong bg-card px-4 text-xl text-ink tabular focus:border-accent aria-invalid:border-danger';

function BigField({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block text-base font-semibold">{label}</label>
      {hint && <p id={`${id}-hint`} className="mt-1 text-sm text-ink-muted">{hint}</p>}
      {children}
      {error && <p id={`${id}-error`} className="mt-1 text-sm font-medium text-danger">{error}</p>}
    </div>
  );
}

const described = (id: string, hint?: string, error?: string) => [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;

function PaneShell({ icon, title, intro, children }: { icon: IconName; title: string; intro: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="inline-flex size-12 items-center justify-center rounded-pill bg-primary-soft text-primary"><Icon name={icon} /></span>
        <div>
          <p className="text-xl font-bold">{title}</p>
          <p className="text-sm text-ink-muted">{intro}</p>
        </div>
      </div>
      <div className="mt-6 flex flex-1 flex-col">{children}</div>
    </section>
  );
}

function AwardPane({ branchId }: { branchId: string }) {
  const [state, dispatch, pending] = useActionState<CounterState, FormData>(awardPoints, {});
  const key = useIdempotencyKey('ugnaya.counter.award.key');
  const [memberCode, setMemberCode] = useState('');
  const [amount, setAmount] = useState('');
  const [receiptNo, setReceiptNo] = useState('');
  const [dismissedAt, setDismissedAt] = useState<number | undefined>(undefined);
  const outcome = state.outcome && state.at !== dismissedAt ? state.outcome : null;
  const errors = state.at !== dismissedAt ? state.fieldErrors ?? {} : {};
  const settled = state.outcome && state.outcome.kind !== 'error';
  useEffect(() => {
    if (settled) key.settle();
  }, [settled, state.at, key]);

  function submit(form: FormData) {
    form.set('idempotencyKey', key.current());
    dispatch(form);
  }
  function nextCustomer() {
    key.renew();
    setMemberCode('');
    setAmount('');
    setReceiptNo('');
    setDismissedAt(state.at);
  }

  return (
    <PaneShell icon="stars" title="Award points" intro="Scan the customer’s member QR, then enter what they spent.">
      {outcome ? (
        <ResultPanel outcome={outcome} onNext={nextCustomer} onRetry={() => setDismissedAt(state.at)} />
      ) : (
        <form action={submit} noValidate className="flex flex-1 flex-col gap-5">
          <input type="hidden" name="branchId" value={branchId} />
          {state.error && state.at !== dismissedAt && <p role="alert" className="rounded-md bg-danger-soft p-3 text-sm text-danger-text">{state.error}</p>}
          <CameraScan label="Scan member QR" target="the customer’s member QR" accept={looksLikeMemberCode} onCode={setMemberCode} />
          <BigField id="award-member" label="Member code" hint="Or type the code under the customer’s QR." error={errors.memberCode}>
            <input id="award-member" name="memberCode" value={memberCode} onChange={(e) => setMemberCode(e.target.value)}
              autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="U:XXXXXXXX:123456"
              aria-invalid={errors.memberCode ? true : undefined} aria-describedby={described('award-member', 'h', errors.memberCode)} className={inputClass} />
          </BigField>
          <BigField id="award-amount" label="Amount spent" error={errors.amount}>
            <div className="relative">
              <span aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 mt-1 -translate-y-1/2 text-xl text-ink-muted">₱</span>
              <input id="award-amount" name="amount" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal"
                autoComplete="off" placeholder="0.00" aria-invalid={errors.amount ? true : undefined}
                aria-describedby={described('award-amount', undefined, errors.amount)} className={`${inputClass} pl-10`} />
            </div>
          </BigField>
          <BigField id="award-receipt" label="Receipt number (optional)" hint="Stops the same receipt from earning twice." error={errors.receiptNo}>
            <input id="award-receipt" name="receiptNo" value={receiptNo} onChange={(e) => setReceiptNo(e.target.value)} autoComplete="off"
              maxLength={40} aria-invalid={errors.receiptNo ? true : undefined} aria-describedby={described('award-receipt', 'h', errors.receiptNo)} className={inputClass} />
          </BigField>
          <button type="submit" disabled={pending} aria-disabled={pending}
            className={`${buttonClasses('primary', 'lg')} mt-auto min-h-16 w-full text-lg disabled:opacity-60`}>
            {pending ? 'Adding points…' : 'Add points'}
          </button>
        </form>
      )}
    </PaneShell>
  );
}

function RedeemPane({ branchId }: { branchId: string }) {
  const [state, dispatch, pending] = useActionState<CounterState, FormData>(redeemVoucher, {});
  const key = useIdempotencyKey('ugnaya.counter.redeem.key');
  const [code, setCode] = useState('');
  const [dismissedAt, setDismissedAt] = useState<number | undefined>(undefined);
  const outcome = state.outcome && state.at !== dismissedAt ? state.outcome : null;
  const errors = state.at !== dismissedAt ? state.fieldErrors ?? {} : {};
  const settled = state.outcome && state.outcome.kind !== 'error';
  useEffect(() => {
    if (settled) key.settle();
  }, [settled, state.at, key]);

  function submit(form: FormData) {
    form.set('idempotencyKey', key.current());
    dispatch(form);
  }
  function nextCustomer() {
    key.renew();
    setCode('');
    setDismissedAt(state.at);
  }

  return (
    <PaneShell icon="redeem" title="Redeem a reward" intro="Scan the voucher QR the customer opens in their app.">
      {outcome ? (
        <ResultPanel outcome={outcome} onNext={nextCustomer} onRetry={() => setDismissedAt(state.at)} />
      ) : (
        <form action={submit} noValidate className="flex flex-1 flex-col gap-5">
          <input type="hidden" name="branchId" value={branchId} />
          {state.error && state.at !== dismissedAt && <p role="alert" className="rounded-md bg-danger-soft p-3 text-sm text-danger-text">{state.error}</p>}
          <CameraScan label="Scan voucher QR" target="the customer’s voucher QR" accept={looksLikeVoucherCode} onCode={setCode} />
          <BigField id="redeem-code" label="Voucher code" hint="Or type the code under the voucher QR." error={errors.voucherCode}>
            <input id="redeem-code" name="voucherCode" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off"
              autoCapitalize="none" spellCheck={false} placeholder="R:…" aria-invalid={errors.voucherCode ? true : undefined}
              aria-describedby={described('redeem-code', 'h', errors.voucherCode)} className={inputClass} />
          </BigField>
          <p className="text-sm text-ink-muted">The reward comes off the customer’s points. Hand it over once you see the green result.</p>
          <button type="submit" disabled={pending} aria-disabled={pending}
            className={`${buttonClasses('primary', 'lg')} mt-auto min-h-16 w-full text-lg disabled:opacity-60`}>
            {pending ? 'Checking voucher…' : 'Redeem'}
          </button>
        </form>
      )}
    </PaneShell>
  );
}

/**
 * The answer, full width of its pane and unmistakable: teal with dark ink for done, red with white for refused. It
 * stays until the cashier taps, and takes focus so a screen reader announces it.
 */
function ResultPanel({ outcome, onNext, onRetry }: { outcome: CounterOutcome; onNext: () => void; onRetry: () => void }) {
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => button.current?.focus(), [outcome]);

  if (outcome.kind === 'error') {
    return (
      <div role="alert" className="flex flex-1 flex-col gap-4 rounded-xl bg-danger p-6 text-on-danger">
        <Icon name="error" size={56} />
        <p className="text-2xl font-bold">Not done</p>
        <p className="text-lg">{outcome.message}</p>
        <p className="text-base font-semibold">{outcome.nextStep}</p>
        <div className="mt-auto grid gap-3 sm:grid-cols-2">
          <button ref={button} type="button" onClick={onRetry} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-pill bg-card px-6 text-lg font-semibold text-ink">
            <Icon name="edit" />Fix and try again
          </button>
          <button type="button" onClick={onNext} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-pill border-2 border-on-danger px-6 text-lg font-semibold">
            Next customer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div role="status" className="flex flex-1 flex-col gap-3 rounded-xl bg-success p-6 text-on-success">
      <Icon name="check_circle" size={64} />
      {outcome.kind === 'award' ? (
        <>
          {outcome.pointsEarned > 0 ? (
            <p className="text-5xl font-extrabold tabular">+{formatNumber(outcome.pointsEarned)}</p>
          ) : (
            <p className="text-3xl font-extrabold">Recorded, no points</p>
          )}
          <p className="text-xl font-semibold">
            {outcome.pointsEarned > 0 ? `${outcome.pointsEarned === 1 ? 'point' : 'points'} added` : 'The amount is below the minimum spend for points.'}
          </p>
          {outcome.balance !== null && <p className="text-lg tabular">New balance here: <strong>{formatPoints(outcome.balance)}</strong></p>}
          {outcome.network && outcome.network.pointsEarned > 0 && (
            <p className="tabular">Plus {formatPoints(outcome.network.pointsEarned)} in UGNAYA network points, usable from {formatDate(outcome.network.availableAt)}.</p>
          )}
        </>
      ) : (
        <>
          <p className="text-lg font-semibold">Hand over</p>
          <p className="text-4xl font-extrabold leading-tight">{outcome.rewardName}</p>
          <p className="text-lg tabular">{formatPoints(outcome.pointsCost)} used · {formatPoints(outcome.balance)} left</p>
        </>
      )}
      {outcome.replayed && (
        <p className="rounded-md bg-card p-3 text-sm font-medium text-ink">
          This was already recorded. You’re seeing the first result; nothing was added or taken twice.
        </p>
      )}
      <button ref={button} type="button" onClick={onNext} className="mt-auto inline-flex min-h-16 w-full items-center justify-center gap-2 rounded-pill bg-ink text-lg font-semibold text-card">
        Next customer<Icon name="arrow_forward" />
      </button>
    </div>
  );
}
