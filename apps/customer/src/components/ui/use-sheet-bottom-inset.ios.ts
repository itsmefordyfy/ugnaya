import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';

// From iOS 26, sheets below full height float above the home indicator, so adding
// the safe-area inset there would leave an empty band under the content.
const FLOATING_SHEETS = Number.parseInt(String(Platform.Version), 10) >= 26;

export function useSheetBottomInset(): number {
  const insets = useSafeAreaInsets();
  return FLOATING_SHEETS ? Spacing.four : insets.bottom + Spacing.two;
}
