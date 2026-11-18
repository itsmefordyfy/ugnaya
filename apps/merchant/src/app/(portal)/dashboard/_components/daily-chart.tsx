'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { niceScale, type DailyPoint } from '@/lib/dashboard';
import { formatDay, formatNumber } from '@/lib/format';

export type DailyChartProps = { daily: DailyPoint[]; summary: string };

const HEIGHT = 220;
const PAD_TOP = 8;
const PAD_LEFT = 40;
const PAD_BOTTOM = 4;
const GAP = 2;

/** A rounded data end (4 px), square at the baseline. */
function barPath(x: number, y: number, w: number, h: number): string {
  if (h <= 0) return '';
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

/**
 * Awards and redemptions per day as paired columns: awards in navy, redemptions in orange with a diagonal texture, so
 * colour is never the only cue (and the legend names both). Drawn in real pixels (measured width) so the rounded ends
 * and the 2 px gap stay true at every size. Hover a day for its numbers; the same numbers are in the table below.
 */
export function DailyChart({ daily, summary }: DailyChartProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  const [active, setActive] = useState<number | null>(null);
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.round(entry.contentRect.width))));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const max = Math.max(0, ...daily.map((d) => Math.max(d.awards, d.redemptions)));
  const { top, ticks } = niceScale(max);
  const plotW = width - PAD_LEFT;
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const slot = daily.length > 0 ? plotW / daily.length : plotW;
  const barW = Math.max(1, Math.min(24, (slot * 0.7 - GAP) / 2));
  const y = (v: number) => PAD_TOP + plotH - (v / top) * plotH;
  const labelIdx = daily.length <= 1 ? [0] : [0, Math.floor((daily.length - 1) / 2), daily.length - 1];
  const point = active !== null ? daily[active] : null;

  return (
    <div>
      <ul className="mb-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-muted" aria-label="Legend">
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="inline-block size-3 rounded-sm bg-primary" />Awards (purchases that earned points)
        </li>
        <li className="flex items-center gap-2">
          <svg aria-hidden="true" width="12" height="12" className="rounded-sm">
            <rect width="12" height="12" className="fill-reward" />
            <rect width="12" height="12" fill={`url(#hatch-legend-${id})`} />
            <defs>
              <pattern id={`hatch-legend-${id}`} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="4" className="stroke-card" strokeWidth="1.5" />
              </pattern>
            </defs>
          </svg>
          Redemptions (rewards handed over)
        </li>
      </ul>

      <div ref={wrap} className="relative" onPointerLeave={() => setActive(null)}>
        <svg width={width} height={HEIGHT} viewBox={`0 0 ${width} ${HEIGHT}`} role="img" aria-labelledby={`chart-title-${id}`} className="block max-w-full overflow-visible">
          <title id={`chart-title-${id}`}>{summary}</title>
          <defs>
            <pattern id={`hatch-${id}`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="5" className="stroke-card" strokeWidth="1.5" strokeOpacity="0.7" />
            </pattern>
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD_LEFT} x2={width} y1={y(t)} y2={y(t)} className="stroke-divider" strokeWidth="1" shapeRendering="crispEdges" />
              <text x={PAD_LEFT - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-ink-muted text-xs tabular">{formatNumber(t)}</text>
            </g>
          ))}
          {daily.map((d, i) => {
            const x0 = PAD_LEFT + i * slot + (slot - (barW * 2 + GAP)) / 2;
            const ha = (d.awards / top) * plotH;
            const hr = (d.redemptions / top) * plotH;
            return (
              <g key={d.day}>
                {active === i && <rect x={PAD_LEFT + i * slot} y={PAD_TOP} width={slot} height={plotH} className="fill-primary-soft" />}
                <path d={barPath(x0, y(d.awards), barW, ha)} className="fill-primary" />
                <path d={barPath(x0 + barW + GAP, y(d.redemptions), barW, hr)} className="fill-reward" />
                <path d={barPath(x0 + barW + GAP, y(d.redemptions), barW, hr)} fill={`url(#hatch-${id})`} />
                {/* The hit target is the whole day, larger than the bars. */}
                <rect x={PAD_LEFT + i * slot} y={0} width={slot} height={HEIGHT} fill="transparent" onPointerEnter={() => setActive(i)} />
              </g>
            );
          })}
          <line x1={PAD_LEFT} x2={width} y1={y(0)} y2={y(0)} className="stroke-border-strong" strokeWidth="1" shapeRendering="crispEdges" />
        </svg>

        <div aria-hidden="true" className="relative mt-2 h-5 text-xs text-ink-muted" style={{ marginLeft: PAD_LEFT }}>
          {labelIdx.map((i) => daily[i] && (
            <span key={i} className="absolute whitespace-nowrap tabular"
              style={{ left: `${((i + 0.5) / daily.length) * 100}%`, transform: i === 0 ? 'translateX(-25%)' : i === daily.length - 1 ? 'translateX(-75%)' : 'translateX(-50%)' }}>
              {formatDay(daily[i].day)}
            </span>
          ))}
        </div>

        {point && active !== null && (
          <div aria-hidden="true" className="pointer-events-none absolute top-0 z-10 rounded-md border border-border bg-card px-3 py-2 text-sm shadow-md"
            style={{ left: Math.min(Math.max(PAD_LEFT + (active + 0.5) * slot - 80, 0), width - 160), width: 160 }}>
            <p className="font-semibold">{formatDay(point.day)}</p>
            <p className="flex justify-between gap-2 text-ink-muted"><span>Awards</span><span className="tabular text-ink">{formatNumber(point.awards)}</span></p>
            <p className="flex justify-between gap-2 text-ink-muted"><span>Redemptions</span><span className="tabular text-ink">{formatNumber(point.redemptions)}</span></p>
          </div>
        )}
      </div>

      <details className="mt-4">
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-accent-text">View as table</summary>
        <div className="mt-2 max-h-80 overflow-y-auto rounded-md border border-divider">
          <table className="w-full text-sm">
            <caption className="sr-only">Awards and redemptions per day</caption>
            <thead className="sticky top-0 bg-card">
              <tr className="text-left text-ink-muted">
                <th scope="col" className="px-3 py-2 font-medium">Day</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Awards</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Redemptions</th>
              </tr>
            </thead>
            <tbody>
              {daily.map((d) => (
                <tr key={d.day} className="border-t border-divider">
                  <th scope="row" className="px-3 py-2 text-left font-normal">{formatDay(d.day)}</th>
                  <td className="px-3 py-2 text-right tabular">{formatNumber(d.awards)}</td>
                  <td className="px-3 py-2 text-right tabular">{formatNumber(d.redemptions)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
