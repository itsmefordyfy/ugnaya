/**
 * The small Markdown subset the legal pages use: ## and ### headings, paragraphs, "- " lists,
 * **bold** and [links](/path). Pure, so it can be tested; components/ui/prose.tsx renders it.
 */
export type Inline =
  | { type: 'text'; text: string }
  | { type: 'strong'; text: string }
  | { type: 'link'; text: string; href: string };

export type Block =
  | { type: 'h2' | 'h3'; text: string }
  | { type: 'p'; inline: Inline[] }
  | { type: 'ul'; items: Inline[][] };

const SAFE_HREF = /^(\/|#|https:\/\/|mailto:)/;

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  const pattern = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) out.push({ type: 'text', text: text.slice(last, index) });
    if (match[1] !== undefined) out.push({ type: 'strong', text: match[1] });
    else if (SAFE_HREF.test(match[3])) out.push({ type: 'link', text: match[2], href: match[3] });
    else out.push({ type: 'text', text: match[2] });
    last = index + match[0].length;
  }
  if (last < text.length) out.push({ type: 'text', text: text.slice(last) });
  // Merge neighbouring text runs (an unsafe link becomes text next to text).
  return out.reduce<Inline[]>((merged, item) => {
    const previous = merged.at(-1);
    if (previous?.type === 'text' && item.type === 'text') previous.text += item.text;
    else merged.push({ ...item });
    return merged;
  }, []);
}

export function parseMarkdown(source: string): Block[] {
  const blocks: Block[] = [];
  for (const chunk of source.replace(/\r\n/g, '\n').split(/\n{2,}/)) {
    const lines = chunk.split('\n').map((line) => line.trim()).filter(Boolean);
    if (lines.length === 0) continue;
    if (lines.every((line) => line.startsWith('- '))) {
      blocks.push({ type: 'ul', items: lines.map((line) => parseInline(line.slice(2))) });
      continue;
    }
    for (const line of lines.filter((l) => l.startsWith('#'))) {
      if (line.startsWith('### ')) blocks.push({ type: 'h3', text: line.slice(4) });
      else if (line.startsWith('## ')) blocks.push({ type: 'h2', text: line.slice(3) });
    }
    const text = lines.filter((l) => !l.startsWith('#')).join(' ');
    if (text) blocks.push({ type: 'p', inline: parseInline(text) });
  }
  return blocks;
}
