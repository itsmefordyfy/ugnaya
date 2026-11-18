/**
 * The navigation icon tiles from the brand board: a white (or dark) glyph on a rounded gradient tile, one
 * tone per destination. Home and Account are purple, My QR orange, Rewards yellow, Merchants and History blue,
 * Vouchers purple, Offers pink, Wallet teal, Notifications orange. The tile ends are a touch deeper than the
 * brand fills so the glyph keeps 3:1 contrast (tile-tones.test.ts); yellow carries a dark glyph, as everywhere.
 */
export type TileTone = { from: string; to: string; glyph: string };

export const TILE_TONES = {
  purple: { from: '#8B5CF6', to: '#6D28D9', glyph: '#FFFFFF' },
  orange: { from: '#F25A1E', to: '#D9420B', glyph: '#FFFFFF' },
  yellow: { from: '#FFC247', to: '#F59E0B', glyph: '#0F172A' },
  blue: { from: '#3B82F6', to: '#1D4ED8', glyph: '#FFFFFF' },
  pink: { from: '#EC4899', to: '#DB2777', glyph: '#FFFFFF' },
  teal: { from: '#0D9488', to: '#0F766E', glyph: '#FFFFFF' },
} as const satisfies Record<string, TileTone>;

export type TileToneName = keyof typeof TILE_TONES;
