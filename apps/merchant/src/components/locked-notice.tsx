import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon, buttonClasses } from '@ugnaya/web-ui';
import { lockedExplanation } from '@/lib/application';
import type { MerchantStatus } from '@/lib/auth/access';

export type LockedNoticeProps = { feature: string; status: MerchantStatus; children?: ReactNode; showApplicationLink?: boolean };

/** Shown in place of a tool that needs an approved business. The database refuses these actions too. */
export function LockedNotice({ feature, status, children, showApplicationLink = true }: LockedNoticeProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-6 sm:p-8">
      <span className="inline-flex size-12 items-center justify-center rounded-pill bg-primary-soft text-primary">
        <Icon name="lock" />
      </span>
      <h2 className="mt-4 font-sans text-xl font-semibold">{feature} is locked for now</h2>
      <p className="mt-2 max-w-xl text-ink-muted">{lockedExplanation(status)}</p>
      {children && <div className="mt-4 max-w-xl text-sm text-ink-muted">{children}</div>}
      {showApplicationLink && (
        <Link href="/application" className={`${buttonClasses('primary')} mt-6`}>See your application</Link>
      )}
    </div>
  );
}
