/** Spacing on a 4 pt grid, in points (pixels on the web). */
export const spacing = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64 } as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const;

export type TypeStyle = { size: number; line: number; weight: number; tabular?: boolean };

export const fontFamily = 'Inter';

/** `figure` is for the big numbers (points, amounts): ExtraBold with tabular digits. */
export const typography = {
  display: { size: 40, line: 48, weight: 700 },
  title: { size: 28, line: 36, weight: 700 },
  heading: { size: 22, line: 28, weight: 600 },
  body: { size: 16, line: 24, weight: 400 },
  label: { size: 14, line: 20, weight: 500 },
  caption: { size: 12, line: 16, weight: 400 },
  figure: { size: 32, line: 40, weight: 800, tabular: true },
} as const satisfies Record<string, TypeStyle>;
