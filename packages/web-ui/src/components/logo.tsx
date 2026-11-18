import { useId } from 'react';
import { layoutOf, logoSvg, type Layout, type Tone } from '@ugnaya/brand';

export type LogoProps = {
  /** `mark` is the symbol alone; `horizontal` is symbol + wordmark; `tagline` adds the tagline and underline; `vertical` stacks them. */
  layout?: Layout;
  /** `auto` (default): the colour mark with a wordmark that follows the theme. `onDark` and `white` for dark or coloured surfaces; `mono` for one navy colour. */
  tone?: 'auto' | Tone;
  /** Rendered height in pixels; the width follows the artwork's proportions. */
  height?: number;
  className?: string;
};

/**
 * The UGNAYA logo, drawn from the same artwork as the exported files in packages/brand/assets
 * (docs/BRAND_AND_DESIGN_SYSTEM.md, section 4). Never stretch it: set `height` and let the width follow.
 */
export function Logo({ layout = 'horizontal', tone = 'auto', height = 32, className }: LogoProps) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const l = layoutOf(layout);
  const svg = logoSvg({
    layout,
    tone: tone === 'auto' ? 'full' : tone,
    idPrefix: `logo${id}`,
    textColor: tone === 'auto' ? 'var(--color-logo-wordmark)' : undefined,
  });
  return (
    <span
      className={`inline-block max-w-full shrink-0 [&>svg]:block [&>svg]:size-full ${className ?? ''}`}
      style={{ width: Math.round((height * l.width) / l.height), height }}
      // The markup is generated from our own constants in @ugnaya/brand, never from user input.
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
