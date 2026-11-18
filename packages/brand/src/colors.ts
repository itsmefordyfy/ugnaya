/** Colours that belong to the logo and the app icon, sampled from the brand board (docs/BRAND_AND_DESIGN_SYSTEM.md, section 4). */

/** The wordmark and every single-colour logo. Darker than the UI's Deep Navy (#1E2A78), as on the board. */
export const INK = '#0D1347';
export const WHITE = '#FFFFFF';
/** The tagline's underline stroke: the brand orange. */
export const ORANGE = '#FF6B35';

type Stop = readonly [offset: number, color: string];
type BoxGradient = { x1: number; y1: number; x2: number; y2: number; stops: readonly Stop[] };

/** The primary app icon's navy tile, lit from the top left (objectBoundingBox units). */
export const TILE_GRADIENT: BoxGradient = {
  x1: 0, y1: 0, x2: 1, y2: 1,
  stops: [[0, '#3B3086'], [0.5, '#1B1B5B'], [1, '#0A103E']],
};

/** The monochrome app icon's tile: deep violet at the bottom left to orange at the top right. */
export const MONO_TILE_GRADIENT: BoxGradient = {
  x1: 0, y1: 1, x2: 1, y2: 0,
  stops: [[0, '#4A17B1'], [0.5, '#A93AD0'], [1, '#FF8036']],
};
