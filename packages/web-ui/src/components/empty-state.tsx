import type { ReactNode } from 'react';
import { Logo } from './logo';

export type EmptyStateProps = {
  title: string;
  /** One plain sentence: what will appear here, and why it is empty. */
  body: string;
  /** The one next step (a button or link). */
  action?: ReactNode;
  /** Replaces the default symbol, e.g. <Ugi pose="thinking" height={120} />. */
  illustration?: ReactNode;
  className?: string;
};

/** An empty list or screen: the symbol, what goes here, one action. Never a bare "No data". */
export function EmptyState({ title, body, action, illustration, className }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center px-6 py-12 text-center ${className ?? ''}`}>
      {illustration ?? (
        <span className="inline-flex size-20 items-center justify-center rounded-pill bg-primary-soft">
          <Logo layout="mark" height={40} />
        </span>
      )}
      <h2 className="mt-5 text-xl font-bold">{title}</h2>
      <p className="mt-2 max-w-sm text-ink-muted">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
