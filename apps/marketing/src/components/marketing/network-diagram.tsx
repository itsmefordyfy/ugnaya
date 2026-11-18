import { Icon, Logo, type IconName } from '@ugnaya/web-ui';

const SHOPS: { icon: IconName; label: string; position: string }[] = [
  { icon: 'local_cafe', label: 'Café', position: 'left-[14%] top-[16%]' },
  { icon: 'emoji_food_beverage', label: 'Milk tea', position: 'left-[86%] top-[16%]' },
  { icon: 'restaurant', label: 'Restaurant', position: 'left-[14%] top-[84%]' },
  { icon: 'fiber_new', label: 'New shop', position: 'left-[86%] top-[84%]' },
];

/** The network idea in one picture: independent shops around one shared wallet. Decorative; the section's text says the same. */
export function NetworkDiagram() {
  return (
    <div className="relative mx-auto aspect-[4/3] w-full max-w-md" aria-hidden="true">
      <svg viewBox="0 0 400 300" className="absolute inset-0 size-full text-border-strong" preserveAspectRatio="none">
        {[[56, 48], [344, 48], [56, 252], [344, 252]].map(([x, y]) => (
          <line key={`${x}-${y}`} x1="200" y1="150" x2={x} y2={y} stroke="currentColor" strokeWidth="2" strokeDasharray="2 6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <div className="gradient-brand absolute left-1/2 top-1/2 flex size-28 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-1 rounded-pill text-on-gradient shadow-lg">
        <Logo layout="mark" tone="white" height={34} />
        <span className="font-display text-xs font-bold uppercase tracking-[0.02em]">One wallet</span>
      </div>
      {SHOPS.map((shop) => (
        <div key={shop.label} className={`absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 ${shop.position}`}>
          <span className="inline-flex size-14 items-center justify-center rounded-pill border border-border bg-card text-primary shadow-sm">
            <Icon name={shop.icon} size={28} />
          </span>
          <span className="text-sm font-medium text-ink-muted">{shop.label}</span>
        </div>
      ))}
    </div>
  );
}
