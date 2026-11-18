import type { ReactNode } from 'react';

export type PageHeaderProps = { title: string; description?: ReactNode; actions?: ReactNode };

/** Page title on the left, the page's one primary action on the right (stacked on a phone). */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-ink-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-3">{actions}</div>}
    </div>
  );
}

export type PanelProps = { title?: string; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; id?: string };

/** A titled block of a page: a white surface with a border (dashboards group by panels, not by stacks of cards). */
export function Panel({ title, description, actions, children, className, id }: PanelProps) {
  return (
    <section id={id} aria-labelledby={title && id ? `${id}-title` : undefined} className={`rounded-lg border border-border bg-card ${className ?? ''}`}>
      {(title || actions) && (
        <div className="flex flex-col gap-3 border-b border-divider px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="min-w-0">
            {title && <h2 id={id ? `${id}-title` : undefined} className="font-sans text-lg font-semibold">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}
