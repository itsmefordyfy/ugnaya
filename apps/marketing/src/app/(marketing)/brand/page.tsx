import type { Metadata } from 'next';
import { colors } from '@ugnaya/ui-tokens';
import { Badge, ButtonLink, Card, Container, EmptyState, Logo, Skeleton, TextField, TileIcon } from '@ugnaya/web-ui';
import type { IconName, TileToneName } from '@ugnaya/web-ui';
import { Demos } from './_components/demos';

export const metadata: Metadata = {
  title: 'Brand',
  description: 'UGNAYA logos, app icons, colours, type and components.',
  robots: { index: false, follow: false },
};

const NAV: { icon: IconName; label: string; tone: TileToneName }[] = [
  { icon: 'home', label: 'Home', tone: 'purple' },
  { icon: 'qr_code_2', label: 'My QR', tone: 'orange' },
  { icon: 'layers', label: 'Rewards', tone: 'yellow' },
  { icon: 'storefront', label: 'Merchants', tone: 'blue' },
  { icon: 'confirmation_number', label: 'Vouchers', tone: 'purple' },
  { icon: 'redeem', label: 'Offers', tone: 'pink' },
  { icon: 'account_balance_wallet', label: 'Wallet', tone: 'teal' },
  { icon: 'history', label: 'History', tone: 'blue' },
  { icon: 'notifications', label: 'Notifications', tone: 'orange' },
  { icon: 'person', label: 'Account', tone: 'purple' },
];

const SWATCHES: { name: string; token: keyof typeof colors.light; role: string }[] = [
  { name: 'Deep Navy', token: 'primary', role: 'Primary' },
  { name: 'Purple', token: 'accent', role: 'Secondary' },
  { name: 'Orange', token: 'reward', role: 'Rewards, actions' },
  { name: 'Yellow', token: 'points', role: 'Points' },
  { name: 'Teal', token: 'success', role: 'Success' },
];

const LOGOS: { file: string; label: string }[] = [
  { file: 'logo-tagline', label: 'Horizontal with tagline' },
  { file: 'logo-horizontal', label: 'Horizontal' },
  { file: 'logo-vertical', label: 'Vertical' },
  { file: 'mark', label: 'Symbol' },
];

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border py-12">
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default function Brand() {
  return (
    <Container className="py-12">
      <h1 className="text-4xl font-extrabold tracking-tight">UGNAYA brand</h1>
      <p className="mt-3 max-w-2xl break-words text-lg text-ink-muted">Logos, app icons, colours, type and the shared components. Source files live in packages/brand and the rules in docs/BRAND_AND_DESIGN_SYSTEM.md.</p>

      <Block title="Logo">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex min-h-48 items-center justify-center rounded-lg border border-border bg-card p-8"><Logo layout="tagline" tone="full" height={110} /></div>
          <div className="flex min-h-48 items-center justify-center rounded-lg bg-[#0D1347] p-8"><Logo layout="horizontal" tone="onDark" height={72} /></div>
          <div className="flex min-h-48 items-center justify-center rounded-lg border border-border bg-card p-8"><Logo layout="vertical" tone="full" height={150} /></div>
          <div className="flex min-h-48 flex-col items-center justify-center gap-6 rounded-lg border border-border bg-card p-8">
            <Logo layout="horizontal" tone="mono" height={56} />
            <div className="gradient-brand flex w-full items-center justify-center rounded-lg p-6"><Logo layout="horizontal" tone="white" height={48} /></div>
          </div>
        </div>
        <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {LOGOS.flatMap(({ file, label }) => [
            <li key={file}><a className="link" href={`/brand/svg/${file}.svg`} download>{label} (SVG)</a></li>,
            ...(file === 'mark' ? [] : [<li key={`${file}-d`}><a className="link" href={`/brand/svg/${file}-on-dark.svg`} download>{label}, dark (SVG)</a></li>, <li key={`${file}-w`}><a className="link" href={`/brand/svg/${file}-white.svg`} download>{label}, white (SVG)</a></li>]),
          ])}
        </ul>
      </Block>

      <Block title="App icon">
        <div className="flex flex-wrap items-end gap-6">
          {[['app-icon.svg', 'Primary', 112], ['app-icon-light.svg', 'Light', 88], ['app-icon-mono.svg', 'Monochrome', 88], ['favicon.svg', 'Favicon', 40]].map(([file, label, size]) => (
            <figure key={file as string} className="text-center">
              {/* eslint-disable-next-line @next/next/no-img-element -- a static brand asset at a fixed size */}
              <img src={`/brand/svg/${file}`} alt={`${label} app icon`} width={size as number} height={size as number} className="mx-auto" />
              <figcaption className="mt-2 text-sm text-ink-muted">{label}</figcaption>
            </figure>
          ))}
        </div>
        <p className="mt-4 break-words text-sm text-ink-muted">iOS, Android and web PNGs are in packages/brand/assets/png (run <code className="font-mono">npm run build --workspace @ugnaya/brand</code> to regenerate).</p>
      </Block>

      <Block title="Colour">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {SWATCHES.map(({ name, token, role }) => (
            <div key={token}>
              <div className="h-20 rounded-lg border border-border" style={{ background: `var(--color-${token})` }} />
              <p className="mt-2 font-semibold">{name}</p>
              <p className="text-sm text-ink-muted">{colors.light[token]} · {role}</p>
            </div>
          ))}
        </div>
      </Block>

      <Block title="Type">
        <div className="space-y-3">
          <p className="font-display text-3xl font-extrabold tracking-tight sm:text-5xl">Montserrat ExtraBold</p>
          <p className="font-display text-3xl font-bold">Montserrat Bold, for headings</p>
          <p className="text-lg">Inter Regular for body text, forms and tables. <span className="font-medium">Inter Medium for labels.</span></p>
          <p className="tabular text-4xl font-extrabold">12,480 <span className="text-base font-medium text-ink-muted">points, tabular digits</span></p>
        </div>
      </Block>

      <Block title="Navigation icons">
        <ul className="grid grid-cols-2 gap-6 sm:grid-cols-5">
          {NAV.map((item) => (
            <li key={item.label} className="flex flex-col items-center gap-2 text-center text-sm">
              <TileIcon icon={item.icon} tone={item.tone} size="lg" />
              {item.label}
            </li>
          ))}
        </ul>
      </Block>

      <Block title="Buttons, badges and fields">
        <div className="flex flex-wrap items-center gap-3">
          <ButtonLink href="#">Primary</ButtonLink>
          <ButtonLink href="#" variant="reward">Redeem</ButtonLink>
          <ButtonLink href="#" variant="secondary">Secondary</ButtonLink>
          <ButtonLink href="#" variant="ghost">Ghost</ButtonLink>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <Badge tone="points" icon="stars">120 pts</Badge>
          <Badge tone="reward">New</Badge>
          <Badge tone="success" icon="check_circle">Verified</Badge>
          <Badge tone="warning" icon="schedule">Pending</Badge>
          <Badge tone="danger" icon="error">Expired</Badge>
          <Badge tone="info" icon="info">Info</Badge>
          <Badge tone="accent">Gold</Badge>
          <Badge>Neutral</Badge>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <TextField name="a" label="Email" placeholder="you@example.com" hint="We never share it." />
          <TextField name="b" label="Mobile number" defaultValue="0917" error="Enter a complete number." />
          <TextField name="c" label="Disabled" disabled defaultValue="Not editable" />
        </div>
      </Block>

      <Block title="Cards, loading and empty">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <p className="text-sm font-medium text-ink-muted">Points issued</p>
            <p className="tabular mt-1 text-3xl font-extrabold">8,420</p>
          </Card>
          <Card variant="raised" className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-full" />
          </Card>
          <Card variant="brand">
            <p className="text-sm font-medium">Your points</p>
            <p className="tabular font-display text-5xl font-extrabold">165</p>
          </Card>
        </div>
        <Card className="mt-4 p-0"><EmptyState title="No rewards yet" body="Rewards you can claim will show up here once you earn points at a participating shop." action={<ButtonLink href="#">Find shops</ButtonLink>} /></Card>
      </Block>

      <Block title="Dialogs and notifications">
        <Demos />
      </Block>
    </Container>
  );
}
