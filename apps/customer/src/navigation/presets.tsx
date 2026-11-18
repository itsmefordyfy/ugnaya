import type { NativeStackNavigationOptions } from 'expo-router';

import { SheetHeader } from '@/components/sheet-header';
import { PageSheetDetent, SheetCornerRadius, type ThemeColors } from '@/constants/theme';

/**
 * How a screen is presented, shared so every form opens the same way: `pageSheet` for forms and editors (iOS's page sheet; an
 * Android form sheet of the same shape with `SheetHeader`), `push` for a page in the stack, `fullScreen` for something with its
 * own close (the scanner, a voucher).
 */
export type ScreenPresets = {
  pageSheet: (title: string) => NativeStackNavigationOptions;
  push: (title: string) => NativeStackNavigationOptions;
  fullScreen: () => NativeStackNavigationOptions;
};

export function makeScreenPresets(colors: ThemeColors): ScreenPresets {
  return {
    pageSheet: (title) =>
      process.env.EXPO_OS === 'android'
        ? {
            title,
            presentation: 'formSheet',
            sheetAllowedDetents: [PageSheetDetent],
            sheetCornerRadius: SheetCornerRadius,
            header: SheetHeader,
            headerLeft: undefined,
            contentStyle: { backgroundColor: colors.background },
          }
        : // Sheets show their own close button, not the shared back chevron.
          { title, presentation: 'modal', unstable_headerLeftItems: undefined },
    push: (title) => ({ title }),
    fullScreen: () => ({ presentation: 'fullScreenModal', headerShown: false }),
  };
}
