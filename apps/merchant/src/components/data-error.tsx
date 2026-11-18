'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Icon, buttonClasses } from '@ugnaya/web-ui';

export type DataErrorProps = { title?: string; message: string };

/** A data screen that couldn't load: say so plainly and offer a retry that reloads only this page's data. */
export function DataError({ title = 'We couldn’t load this', message }: DataErrorProps) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-danger-soft bg-danger-soft p-5 text-danger-text">
      <p className="flex items-center gap-2 font-semibold"><Icon name="error" size={20} />{title}</p>
      <p className="text-sm">{message}</p>
      <button type="button" disabled={pending} onClick={() => start(() => router.refresh())} className={`${buttonClasses('secondary')} disabled:opacity-60`}>
        <Icon name="refresh" size={20} />{pending ? 'Trying again…' : 'Try again'}
      </button>
    </div>
  );
}
