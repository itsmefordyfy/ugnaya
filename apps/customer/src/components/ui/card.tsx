import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { useGuardedPress } from './swipe-press-guard';

export type CardProps = Omit<ViewProps, 'style'> & {
  children: ReactNode;
  /** Makes the whole card a single pressable target. */
  onPress?: () => void;
  padded?: boolean;
  tone?: ThemeColor;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/** A solid white content card (20 pt corners, a soft shadow): records and lists stay solid so the glass controls stand out above them. */
export function Card({ children, onPress, padded = true, tone = 'backgroundElement', style, ...rest }: CardProps) {
  const theme = useTheme();
  // The soft shadow sits on the card itself, so it isn't clipped (no overflow: hidden here).
  const cardStyle = [styles.card, { backgroundColor: theme[tone], borderColor: theme.border, boxShadow: theme.shadowCard }, padded && styles.padded, style];
  // Inside a swipeable row, a swipe mustn't also open the card.
  const pressHandlers = useGuardedPress(onPress);

  if (onPress) {
    return (
      <Pressable accessibilityRole="button" {...pressHandlers} style={({ pressed }) => [cardStyle, pressed && styles.pressed]} {...rest}>
        {children}
      </Pressable>
    );
  }

  return (
    <View style={cardStyle} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.card,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
  },
  // Comfortable inside: 20 on every side.
  padded: {
    padding: Spacing.three + Spacing.one,
  },
  // A slight press-in rather than only a fade; scaling doesn't move the layout around it.
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
});
