import { formatCount, formatDay } from '@/lib/format';
import { labelIndexes, niceMax, ticks } from '@/lib/chart-scale';

export type DailyChartProps = {
  title: string;
  points: { day: string; value: number }[];
  /** Unit for the tooltip and table, e.g. "transactions". */
  unit: string;
};

const HEIGHT = 160;

/**
 * Daily bars, rendered on the server as SVG (no chart script: the CSP allows none). The SVG stretches to the width;
 * labels are HTML so they stay crisp and readable on a phone. Each bar has a native tooltip, and a table view is one
 * click away. Days are UTC calendar days, and the chart says so.
 */
export function DailyChart({ title, points, unit }: DailyChartProps) {
  const values = points.map((p) => Number(p.value) || 0);
  const total = values.reduce((a, b) => a + b, 0);
  const max = niceMax(Math.max(0, ...values));
  const n = Math.max(1, points.length);
  const slot = 100 / n;
  const bar = Math.max(slot * 0.7, 0.2);
  const labels = labelIndexes(points.length);
  const peak = points.length ? points[values.indexOf(Math.max(...values))] : null;

  return (
    <figure className="rounded-lg border border-border bg-card p-4">
      <figcaption className="flex items-baseline justify-between gap-2">
        <span className="font-sans text-sm font-semibold">{title}</span>
        <span className="tabular text-xs text-ink-muted">{formatCount(total)} total</span>
      </figcaption>
      <div className="relative mt-3 pl-10">
        {/* y-axis labels and gridlines */}
        <div className="absolute inset-y-0 left-0 w-9" aria-hidden="true">
          {ticks(max).map((t) => (
            <span key={t} className="tabular absolute right-1 -translate-y-1/2 text-[11px] text-ink-muted" style={{ top: `${100 - (t / max) * 100}%` }}>
              {formatCount(t)}
            </span>
          ))}
        </div>
        <svg viewBox={`0 0 100 ${HEIGHT}`} preserveAspectRatio="none" className="block h-40 w-full overflow-visible" role="img"
          aria-label={`${title}: ${formatCount(total)} ${unit} over ${points.length} days${peak && total > 0 ? `, highest ${formatCount(Math.max(...values))} on ${formatDay(peak.day)}` : ''}.`}>
          {ticks(max).map((t) => (
            <line key={t} x1="0" x2="100" y1={HEIGHT - (t / max) * HEIGHT} y2={HEIGHT - (t / max) * HEIGHT}
              className="stroke-divider" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          ))}
          {points.map((p, i) => {
            const v = values[i];
            const h = (v / max) * HEIGHT;
            return (
              <g key={p.day} className="group">
                <title>{`${formatDay(p.day)} (UTC): ${formatCount(v)} ${unit}`}</title>
                <rect x={i * slot} y="0" width={slot} height={HEIGHT} fill="transparent" />
                {v > 0 && (
                  <rect x={i * slot + (slot - bar) / 2} y={HEIGHT - Math.max(h, 1)} width={bar} height={Math.max(h, 1)}
                    className="fill-primary group-hover:fill-accent" />
                )}
              </g>
            );
          })}
        </svg>
        <div className="relative mt-1 h-4" aria-hidden="true">
          {points.map((p, i) => labels.has(i) && (
            <span key={p.day} className="tabular absolute whitespace-nowrap text-[11px] text-ink-muted"
              style={{ left: `${(i + 0.5) * slot}%`, transform: i === 0 ? 'none' : i === points.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)' }}>
              {formatDay(p.day, { short: true })}
            </span>
          ))}
        </div>
      </div>
      <details className="mt-3 text-xs">
        <summary className="link min-h-11 cursor-pointer py-2">Show as table (days in UTC)</summary>
        <div className="max-h-56 overflow-y-auto">
          <table className="w-full">
            <thead><tr className="text-left text-ink-muted"><th className="py-1 font-medium">Day (UTC)</th><th className="py-1 text-right font-medium">{unit}</th></tr></thead>
            <tbody>
              {points.map((p, i) => (
                <tr key={p.day} className="border-t border-divider"><td className="py-1">{formatDay(p.day)}</td><td className="tabular py-1 text-right">{formatCount(values[i])}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

/** A ranked list with proportional bars (categories, top merchants). Bars are HTML; the number is always written. */
export function BarList({ items, empty }: { items: { label: string; value: number; href?: string; hint?: string }[]; empty: string }) {
  if (items.length === 0) return <p className="text-sm text-ink-muted">{empty}</p>;
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.label} className="text-sm">
          <div className="flex items-baseline justify-between gap-3">
            {item.href ? <a href={item.href} className="link truncate">{item.label}</a> : <span className="truncate">{item.label}</span>}
            <span className="tabular shrink-0 font-medium">{formatCount(item.value)}{item.hint && <span className="ml-1 text-xs font-normal text-ink-muted">{item.hint}</span>}</span>
          </div>
          <div className="mt-1 h-2 rounded-pill bg-primary-soft" aria-hidden="true">
            <div className="h-2 rounded-pill bg-primary" style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
