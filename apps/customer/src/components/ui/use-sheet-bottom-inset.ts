import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';

/** Android sheets run edge to edge, so content must clear the system navigation bar. */
export function useSheetBottomInset(): number {
  const insets = useSafeAreaInsets();
  return insets.bottom + Spacing.three;
}
