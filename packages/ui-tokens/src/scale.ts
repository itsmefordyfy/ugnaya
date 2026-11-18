/** Spacing on a 4 pt grid, in points (pixels on the web). 20 and up to 96 serve web sections. */
export const spacing = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64, 20: 80, 24: 96 } as const;

/** sm chips and tags, md inputs and small cards, lg cards, xl sheets and the wallet card, pill buttons and badges. */
export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const;

/** Montserrat for the wordmark, headlines and the wallet balance (never below 18 px, never data); Inter for everything else. */
export const fontFamily = { brand: 'Montserrat', text: 'Inter' } as const;
export type FontRole = keyof typeof fontFamily;

export type TypeStyle = { family: FontRole; size: number; line: number; weight: number; tabular?: boolean };

/**
 * `figure` is for amounts, counters and anything that changes or sits in a column: Inter ExtraBold with
 * tabular digits. `balance` is the wallet's static points total. `hero` is marketing only (40/44 below 640 px).
 */
export const typography = {
  hero: { family: 'brand', size: 56, line: 60, weight: 800 },
  balance: { family: 'brand', size: 48, line: 52, weight: 800 },
  display: { family: 'brand', size: 40, line: 48, weight: 700 },
  title: { family: 'brand', size: 28, line: 36, weight: 700 },
  heading: { family: 'brand', size: 22, line: 28, weight: 600 },
  subheading: { family: 'text', size: 18, line: 24, weight: 600 },
  body: { family: 'text', size: 16, line: 24, weight: 400 },
  label: { family: 'text', size: 14, line: 20, weight: 500 },
  caption: { family: 'text', size: 12, line: 16, weight: 400 },
  figure: { family: 'text', size: 32, line: 40, weight: 800, tabular: true },
} as const satisfies Record<string, TypeStyle>;

/** CSS box-shadow strings. Dark surfaces use borders instead, so every dark shadow is none. React Native uses these as boxShadow. */
export const shadows = {
  light: {
    sm: '0 1px 2px rgb(15 23 42 / 0.06)',
    md: '0 4px 12px -2px rgb(15 23 42 / 0.10)',
    lg: '0 16px 40px -12px rgb(30 42 120 / 0.28)',
  },
  dark: { sm: 'none', md: 'none', lg: 'none' },
} as const;

/** 16 inline with text, 20 in buttons and rows, 24 navigation, 32 feature and empty states, 48 illustration. */
export const iconSize = { inline: 16, control: 20, nav: 24, feature: 32, illustration: 48 } as const;

/** Milliseconds. Enter eases out; an exit takes about 70% of the enter time. */
export const motion = { press: 100, fast: 150, base: 220, slow: 360, countUp: 600 } as const;
export const easing = { enter: 'cubic-bezier(0.2, 0, 0, 1)', exit: 'cubic-bezier(0.4, 0, 1, 1)' } as const;

/** Minimum touch target: 44 everywhere, 56 for the staff/POS app's primary controls. */
export const touchTarget = { min: 44, pos: 56 } as const;

export const breakpoints = { sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536 } as const;
