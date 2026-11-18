import { Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { MinTouchSize, Radius, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Icon, type IconName } from './icon';

export type IconButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  icon: IconName;
  /** Required: icon-only buttons have no visible text for screen readers. */
  accessibilityLabel: string;
  color?: ThemeColor;
  /** Fixed icon color for buttons over photos, where theme colors don't apply (pair with a `style` background). */
  tint?: string;
  /** `none`: just the glyph, e.g. a header action that shouldn't read as a filled circle. */
  background?: ThemeColor | 'none';
  /** Glyph size; a bare glyph usually wants to be a little larger than one on a circle. */
  iconSize?: number;
  /** The filled-in glyph, for an "on" state (a chosen favorite star). */
  filled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function IconButton({ icon, color = 'primary', tint, background = 'primarySoft', iconSize = 18, filled = false, style, ...rest }: IconButtonProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={4}
      style={({ pressed }) => [styles.button, { backgroundColor: background === 'none' ? 'transparent' : theme[background] }, pressed && styles.pressed, style]}
      {...rest}>
      <Icon name={icon} size={iconSize} color={color} tint={tint} filled={filled} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: MinTouchSize - 4,
    height: MinTouchSize - 4,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
