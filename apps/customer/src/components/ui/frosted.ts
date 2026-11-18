import { StyleSheet, type ViewStyle } from 'react-native';

import type { ThemeColors } from '@/constants/theme';

/**
 * The frosted look that stands in for iOS 26 Liquid Glass where there's no glass (Android, older
 * iOS): a see-through card fill, a hairline rim and a soft shadow. One recipe for every frosted
 * control (round icon buttons, header text buttons), so they match on every screen. The shadow is
 * tight enough to fit inside a screen header, which clips anything that spills out.
 */
export function frostedSurface(theme: ThemeColors): ViewStyle {
  return {
    backgroundColor: `${theme.backgroundElement}E6`,
    borderColor: theme.border,
    borderWidth: StyleSheet.hairlineWidth,
    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.12)',
  };
}
