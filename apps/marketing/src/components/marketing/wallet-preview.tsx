import { Badge, Icon, Logo, type IconName } from '@ugnaya/web-ui';

const SHOPS: { icon: IconName; name: string; points: number }[] = [
  { icon: 'local_cafe', name: 'Kape ni Juan', points: 120 },
  { icon: 'restaurant', name: 'Lola’s Kitchen', points: 45 },
];

/**
 * An illustration of the customer wallet (docs/BRAND_AND_DESIGN_SYSTEM.md, section 7): the balance is the
 * biggest thing on screen, one primary action, merchants as a plain list. Sample data, not a screenshot.
 */
export function WalletPreview() {
  const total = SHOPS.reduce((sum, shop) => sum + shop.points, 0);
  return (
    <figure
      className="mx-auto w-full max-w-[300px] rounded-[40px] border-[10px] border-ink bg-surface p-4 shadow-lg"
      aria-label="Illustration of the UGNAYA wallet, with sample points"
    >
      <div className="gradient-brand rounded-xl p-5 text-on-gradient shadow-lg">
        <Logo tone="white" height={30} />
        <p className="mt-5 text-sm font-medium">Your points</p>
        <p className="tabular font-display text-5xl font-extrabold leading-none">{total}</p>
        <Badge tone="points" icon="stars" className="mt-3">Free upsize unlocked</Badge>
        <div className="mt-5 flex min-h-11 items-center justify-center gap-2 rounded-pill bg-reward text-sm font-semibold text-on-reward">
          <Icon name="qr_code_2" size={20} />
          Show my QR
        </div>
      </div>
      <ul className="mt-3 divide-y divide-divider px-1">
        {SHOPS.map((shop) => (
          <li key={shop.name} className="flex items-center gap-3 py-3">
            <span className="inline-flex size-9 items-center justify-center rounded-pill bg-primary-soft text-primary">
              <Icon name={shop.icon} size={20} />
            </span>
            <span className="flex-1 text-sm font-medium">{shop.name}</span>
            <span className="tabular text-sm font-semibold text-points-text">{shop.points} pts</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
