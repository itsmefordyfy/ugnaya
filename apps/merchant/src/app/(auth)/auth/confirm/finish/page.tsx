import type { Metadata } from 'next';
import { FinishSession } from './finish-session';

export const metadata: Metadata = { title: 'Confirming your email', robots: { index: false } };

export default function ConfirmFinish() {
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Confirming your email</h1>
      <p className="mt-2 text-ink-muted">One moment.</p>
      <div className="mt-8">
        <FinishSession />
      </div>
    </>
  );
}
