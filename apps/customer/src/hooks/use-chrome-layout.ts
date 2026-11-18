import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { VerticalChromeMinInset } from '@/constants/theme';

export type ChromeLayout = {
  /** The system's bars (status, tabs) run along a side edge, as on the iPhone Duo: the sides have their own insets. */
  vertical: boolean;
  /** The edge those bars are on (the one with the larger inset). */
  side: 'left' | 'right';
  /** That edge's inset, 0 when the bars are horizontal. */
  inset: number;
};

/**
 * Whether the system lays its bars out along a side (iPhone Duo, 2026-10-25) instead of across the
 * top and bottom. Read from the safe-area insets, which is how iOS reports it: never from the
 * device's name, so any screen that gets side bars is handled the same way.
 */
export function useChromeLayout(): ChromeLayout {
  const { left, right } = useSafeAreaInsets();
  const inset = Math.max(left, right);
  return { vertical: inset >= VerticalChromeMinInset, side: left > right ? 'left' : 'right', inset: inset >= VerticalChromeMinInset ? inset : 0 };
}
