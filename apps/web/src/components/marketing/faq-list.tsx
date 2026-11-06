import type { FaqItem } from '@/lib/faq';

export type FaqListProps = { items: FaqItem[] };

export function FaqList({ items }: FaqListProps) {
  return (
    <div className="divide-y divide-border rounded-xl border border-border bg-card">
      {items.map((item) => (
        <details key={item.q} className="group px-6 py-4">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-semibold">
            {item.q}
            <span aria-hidden="true" className="text-xl text-ink-muted transition group-open:rotate-45">+</span>
          </summary>
          <p className="mt-2 text-ink-muted">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
