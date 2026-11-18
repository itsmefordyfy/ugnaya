import { StyleSheet, Text, type TextProps } from 'react-native';

import { Typography, type ThemeColor, type TypographyRole } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextType = TypographyRole;

export type ThemedTextProps = TextProps & {
  /** The role in the type scale (constants/theme `Typography`); `body` by default. */
  type?: ThemedTextType;
  themeColor?: ThemeColor;
  /** Tabular digits keep amounts and timers from jittering as values change. */
  tabular?: boolean;
};

/**
 * The big roles (hero, title, stats) stop growing at 1.6× the phone's text size, so a large
 * Dynamic Type setting still fits a number in its card; every other role scales freely.
 */
const MAX_SCALE: Partial<Record<ThemedTextType, number>> = { hero: 1.6, title: 1.6, stat: 1.6, statSmall: 1.8, wordmark: 1.4 };

export function ThemedText({ style, type = 'body', themeColor, tabular, maxFontSizeMultiplier, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  const requested: ThemeColor = themeColor ?? (type === 'link' ? 'primaryText' : 'text');
  // Mint as text is unreadable; mint text always uses its ink step.
  const color: ThemeColor = requested === 'primary' ? 'primaryText' : requested;

  return (
    <Text
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? MAX_SCALE[type]}
      style={[{ color: theme[color] }, styles.base, Typography[type], tabular && styles.tabular, style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    // Android pads text above and below for accents by default; iOS doesn't, so the same line
    // height laid out taller on Android and text sat lower in buttons and rows.
    includeFontPadding: false,
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
});
