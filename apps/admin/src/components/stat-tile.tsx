import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon, type IconName } from '@ugnaya/web-ui';

export type StatTileProps = {
  label: string;
  value: ReactNode;
  /** A short line under the figure: what it counts, or a breakdown. */
  hint?: ReactNode;
  icon?: IconName;
  href?: string;
  /** Unavailable figures (no source yet) are shown as such, never as zero. */
  muted?: boolean;
};

export function StatTile({ label, value, hint, icon, href, muted }: StatTileProps) {
  const body = (
    <>
      <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
        {icon && <Icon name={icon} size={16} />}
        {label}
      </p>
      <p className={`tabular mt-2 font-sans text-2xl font-bold ${muted ? 'text-base font-semibold text-ink-muted' : ''}`}>{value}</p>
      {hint && <div className="mt-1 text-xs text-ink-muted">{hint}</div>}
    </>
  );
  const base = 'block rounded-lg border border-border bg-card p-4';
  return href ? <Link href={href} className={`${base} hover:border-primary`}>{body}</Link> : <div className={base}>{body}</div>;
}

export function TileGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-4">{children}</div>;
}
