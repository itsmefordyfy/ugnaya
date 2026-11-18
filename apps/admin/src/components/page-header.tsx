import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon } from '@ugnaya/web-ui';

export type PageHeaderProps = {
  title: string;
  description?: ReactNode;
  /** Buttons on the right (they wrap under the title on a phone). */
  actions?: ReactNode;
  back?: { href: string; label: string };
};

export function PageHeader({ title, description, actions, back }: PageHeaderProps) {
  return (
    <header className="mb-6">
      {back && (
        <Link href={back.href} className="link mb-2 inline-flex min-h-11 items-center gap-1 text-sm">
          <Icon name="chevron_left" size={18} />
          {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          {description && <div className="mt-1 max-w-3xl text-sm text-ink-muted">{description}</div>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}

/** A titled block inside a page. */
export function Section({ title, description, actions, children, className }: {
  title: string; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <section className={`rounded-lg border border-border bg-card ${className ?? ''}`}>
      <div className="flex flex-col gap-2 border-b border-divider px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-sans text-base font-semibold">{title}</h2>
          {description && <p className="text-xs text-ink-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

/** Label / value pairs, two columns from 640 px. */
export function DetailList({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-xs font-medium uppercase tracking-wide text-ink-muted">{item.label}</dt>
          <dd className="mt-0.5 break-words">{item.value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}
