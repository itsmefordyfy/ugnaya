import Link from 'next/link';
import type { Inline } from '@/lib/markdown';
import { parseMarkdown } from '@/lib/markdown';

export type ProseProps = { markdown: string };

function Inlines({ items }: { items: Inline[] }) {
  return items.map((item, index) => {
    if (item.type === 'strong') return <strong key={index} className="font-semibold text-ink">{item.text}</strong>;
    if (item.type === 'link') {
      return item.href.startsWith('/') ? (
        <Link key={index} href={item.href} className="font-medium link">{item.text}</Link>
      ) : (
        <a key={index} href={item.href} className="font-medium link">{item.text}</a>
      );
    }
    return <span key={index}>{item.text}</span>;
  });
}

/** Long-form text (legal pages) from the Markdown subset in lib/markdown. */
export function Prose({ markdown }: ProseProps) {
  return (
    <div className="max-w-3xl space-y-4 text-ink-muted">
      {parseMarkdown(markdown).map((block, index) => {
        switch (block.type) {
          case 'h2':
            return <h2 key={index} className="pt-6 text-2xl font-bold text-ink">{block.text}</h2>;
          case 'h3':
            return <h3 key={index} className="pt-2 font-sans text-lg font-semibold text-ink">{block.text}</h3>;
          case 'ul':
            return (
              <ul key={index} className="list-disc space-y-2 pl-6">
                {block.items.map((item, i) => <li key={i}><Inlines items={item} /></li>)}
              </ul>
            );
          default:
            return <p key={index}><Inlines items={block.inline} /></p>;
        }
      })}
    </div>
  );
}
