import { MARK, TAGLINE, TRADEMARK, WORDMARK } from './geometry.ts';
import { INK, MONO_TILE_GRADIENT, ORANGE, TILE_GRADIENT, WHITE } from './colors.ts';

export const LAYOUTS = ['mark', 'horizontal', 'tagline', 'vertical'] as const;
export type Layout = (typeof LAYOUTS)[number];
/** full: colour mark, navy wordmark (light backgrounds). onDark: colour mark, white wordmark. mono: one navy colour. white: one white colour. */
export const TONES = ['full', 'onDark', 'mono', 'white'] as const;
export type Tone = (typeof TONES)[number];

const f = (n: number) => String(Math.round(n * 10) / 10);

type Box = { x: number; y: number; width: number; height: number };
type Placed = { x: number; y: number; scale: number };
export type LogoLayout = {
  width: number;
  height: number;
  markBox: Box;
  wordmarkBox: Box;
  taglineBox?: Box;
  mark: Placed;
  wordmark?: Placed;
  trademark?: Placed;
  tagline?: Placed;
  swoosh?: string;
};

// Proportions follow the board: the wordmark's width is about twice the mark's, the gap about 15% of the mark's height.
const WORD = 0.464;                 // wordmark scale: font size 464 on the mark's 914-unit height
const GAP = 150;
const TM = WORD * 0.26;
const TM_GAP = 20;

export function layoutOf(layout: Layout): LogoLayout {
  const wordW = WORDMARK.width * WORD;
  const capH = WORDMARK.capHeight * WORD;
  const tmW = TRADEMARK.width * TM;
  const H = MARK.height;
  if (layout === 'mark') {
    const box = { x: 0, y: 0, width: MARK.width, height: H };
    return { width: MARK.width, height: H, markBox: box, wordmarkBox: { x: 0, y: 0, width: 0, height: 0 }, mark: { x: 0, y: 0, scale: 1 } };
  }
  if (layout === 'vertical') {
    const overhang = TM_GAP + tmW;                       // the trademark hangs off the right; mirror it so the lockup centres
    const markW = 0.64 * wordW;
    const s = markW / MARK.width;
    const markH = MARK.height * s;
    const vGap = 230;
    const width = wordW + 2 * overhang;
    const baseline = markH + vGap + capH;
    const wordX = overhang;
    return {
      width, height: baseline,
      markBox: { x: wordX + (wordW - markW) / 2, y: 0, width: markW, height: markH },
      wordmarkBox: { x: wordX, y: baseline - capH, width: wordW + overhang, height: capH },
      mark: { x: wordX + (wordW - markW) / 2, y: 0, scale: s },
      wordmark: { x: wordX, y: baseline, scale: WORD },
      trademark: { x: wordX + wordW + TM_GAP, y: baseline - capH + TRADEMARK.capHeight * TM, scale: TM },
    };
  }
  const wordX = MARK.width + GAP;
  const width = wordX + wordW + TM_GAP + tmW;
  if (layout === 'horizontal') {
    // Centred exactly on the symbol (owner's call, 2026-11-07: the board's slight lift left empty space below the wordmark).
    const baseline = H / 2 + capH / 2;
    return {
      width, height: H,
      markBox: { x: 0, y: 0, width: MARK.width, height: H },
      wordmarkBox: { x: wordX, y: baseline - capH, width: width - wordX, height: capH },
      mark: { x: 0, y: 0, scale: 1 },
      wordmark: { x: wordX, y: baseline, scale: WORD },
      trademark: { x: wordX + wordW + TM_GAP, y: baseline - capH + TRADEMARK.capHeight * TM, scale: TM },
    };
  }
  // tagline: the wordmark with the tagline and a short orange underline beneath it, centred on the mark
  const tagScale = wordW / TAGLINE.width;
  const tagCap = 727 * tagScale;
  const blockH = capH + 201 + 112;
  const baseline = (H - blockH) / 2 + capH;
  const tagBaseline = baseline + 201;
  const sy = tagBaseline + 72;
  const sx1 = wordX + 0.58 * wordW;
  const sx2 = wordX + 0.97 * wordW;
  return {
    width, height: H,
    markBox: { x: 0, y: 0, width: MARK.width, height: H },
    wordmarkBox: { x: wordX, y: baseline - capH, width: width - wordX, height: capH },
    taglineBox: { x: wordX, y: tagBaseline - tagCap, width: wordW, height: tagCap + 90 },
    mark: { x: 0, y: 0, scale: 1 },
    wordmark: { x: wordX, y: baseline, scale: WORD },
    trademark: { x: wordX + wordW + TM_GAP, y: baseline - capH + TRADEMARK.capHeight * TM, scale: TM },
    tagline: { x: wordX, y: tagBaseline, scale: tagScale },
    swoosh: `M${f(sx1)} ${f(sy + 8)}Q${f((sx1 + sx2) / 2)} ${f(sy - 16)} ${f(sx2)} ${f(sy - 6)}`,
  };
}

const gradientDefs = (prefix: string) =>
  MARK.pieces.map((p) => {
    const g = p.gradient;
    const stops = g.stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('');
    return `<linearGradient id="${prefix}-${p.name}" gradientUnits="userSpaceOnUse" x1="${g.x1}" y1="${g.y1}" x2="${g.x2}" y2="${g.y2}">${stops}</linearGradient>`;
  }).join('');

/** The four ribbon pieces, bottom to top, placed at (x, y) with a scale. `fill` is a flat colour or null for the gradients. */
const markPaths = (prefix: string, at: Placed, fill: string | null) =>
  `<g transform="translate(${f(at.x)} ${f(at.y)}) scale(${at.scale.toFixed(4)})">${MARK.pieces
    .map((p) => `<path d="${p.d}" fill="${fill ?? `url(#${prefix}-${p.name})`}"/>`)
    .join('')}</g>`;

const textPath = (d: string, at: Placed, fill: string) =>
  `<path transform="translate(${f(at.x)} ${f(at.y)}) scale(${at.scale.toFixed(5)})" d="${d}" fill="${fill}"/>`;

export type LogoOptions = {
  layout: Layout;
  tone: Tone;
  idPrefix?: string;
  /** Overrides the wordmark, trademark and tagline colour, e.g. a CSS variable so the wordmark follows the theme. */
  textColor?: string;
};

/** A standalone logo svg. Give each logo inlined on one page its own `idPrefix` so gradient ids don't collide. */
export function logoSvg({ layout, tone, idPrefix = 'ug', textColor }: LogoOptions): string {
  const l = layoutOf(layout);
  const colourMark = tone === 'full' || tone === 'onDark';
  const text = textColor ?? (tone === 'onDark' || tone === 'white' ? WHITE : INK);
  const markFill = colourMark ? null : tone === 'white' ? WHITE : INK;
  const parts = [
    colourMark ? `<defs>${gradientDefs(idPrefix)}</defs>` : '',
    markPaths(idPrefix, l.mark, markFill),
    l.wordmark ? textPath(WORDMARK.d, l.wordmark, text) : '',
    l.trademark ? textPath(TRADEMARK.d, l.trademark, text) : '',
    l.tagline ? textPath(TAGLINE.d, l.tagline, text) : '',
    l.swoosh ? `<path d="${l.swoosh}" fill="none" stroke="${tone === 'full' || tone === 'onDark' ? ORANGE : text}" stroke-width="9" stroke-linecap="round"/>` : '',
  ].join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f(l.width)} ${f(l.height)}" role="img" aria-label="UGNAYA"><title>UGNAYA</title>${parts}</svg>`;
}

export const APP_ICON_KINDS = ['primary', 'light', 'mono', 'favicon', 'foreground', 'monochromeLayer', 'background'] as const;
export type AppIconKind = (typeof APP_ICON_KINDS)[number];

const boxGradient = (id: string, g: typeof TILE_GRADIENT) =>
  `<linearGradient id="${id}" x1="${g.x1}" y1="${g.y1}" x2="${g.x2}" y2="${g.y2}">${g.stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;

/**
 * The app icon on a 1024 canvas. `rounded` draws the squircle-ish tile for web and presentation; iOS and the Android
 * background layer want a full-bleed square (the system rounds it). `foreground` and `monochromeLayer` are the transparent
 * Android adaptive layers, sized to sit inside the 66% safe zone.
 */
export function appIconSvg({ kind, rounded }: { kind: AppIconKind; rounded: boolean }): string {
  const place = (fraction: number): Placed => {
    const scale = (fraction * 1024) / MARK.width;
    return { x: (1024 - MARK.width * scale) / 2, y: (1024 - MARK.height * scale) / 2, scale };
  };
  const rx = rounded ? ' rx="232"' : '';
  const tile = (fill: string) => `<rect width="1024" height="1024"${rx} fill="${fill}"/>`;
  let defs = '';
  let body = '';
  switch (kind) {
    case 'primary':
    case 'favicon':
      defs = boxGradient('tile', TILE_GRADIENT) + gradientDefs('i');
      body = tile('url(#tile)') + markPaths('i', place(kind === 'favicon' ? 0.74 : 0.66), null);
      break;
    case 'light':
      defs = gradientDefs('i');
      body = tile(WHITE) + markPaths('i', place(0.66), null);
      break;
    case 'mono':
      defs = boxGradient('tile', MONO_TILE_GRADIENT);
      body = tile('url(#tile)') + markPaths('i', place(0.66), WHITE);
      break;
    case 'background':
      defs = boxGradient('tile', TILE_GRADIENT);
      body = '<rect width="1024" height="1024" fill="url(#tile)"/>';
      break;
    case 'foreground':
      defs = gradientDefs('i');
      body = markPaths('i', place(0.46), null);
      break;
    case 'monochromeLayer':
      body = markPaths('i', place(0.46), WHITE);
      break;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024" role="img" aria-label="UGNAYA"><title>UGNAYA</title>${defs ? `<defs>${defs}</defs>` : ''}${body}</svg>`;
}
