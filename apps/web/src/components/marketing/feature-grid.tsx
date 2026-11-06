import { Icon, type IconName } from '@/components/ui/icon';

export type Feature = { icon: IconName; title: string; body: string };
export type FeatureGridProps = { items: Feature[]; columns?: 2 | 3 };

export function FeatureGrid({ items, columns = 3 }: FeatureGridProps) {
  return (
    <ul className={`grid gap-6 sm:grid-cols-2 ${columns === 3 ? 'lg:grid-cols-3' : ''}`}>
      {items.map((item) => (
        <li key={item.title} className="flex gap-4">
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon name={item.icon} />
          </span>
          <div>
            <h3 className="font-semibold">{item.title}</h3>
            <p className="mt-1 text-ink-muted">{item.body}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
