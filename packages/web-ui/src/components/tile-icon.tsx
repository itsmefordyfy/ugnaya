import { TILE_TONES, type TileToneName } from '../lib/tile-tones';
import { Icon, type IconName } from './icon';

export type TileIconProps = {
  icon: IconName;
  tone?: TileToneName;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const SIZES = { sm: { box: 36, glyph: 20 }, md: { box: 48, glyph: 24 }, lg: { box: 64, glyph: 32 } } as const;

/**
 * A navigation or feature icon in the brand board's style: a glyph on a rounded gradient tile. Decorative:
 * the label next to it carries the meaning. Use sparingly (the brand's bright colours are for moments, not walls).
 */
export function TileIcon({ icon, tone = 'purple', size = 'md', className }: TileIconProps) {
  const t = TILE_TONES[tone];
  const { box, glyph } = SIZES[size];
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-[24%] shadow-sm ${className ?? ''}`}
      style={{ width: box, height: box, color: t.glyph, backgroundImage: `linear-gradient(145deg, ${t.from}, ${t.to})` }}
    >
      <Icon name={icon} size={glyph} />
    </span>
  );
}
