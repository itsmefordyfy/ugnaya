import { GlassView } from 'expo-glass-effect';
import { Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { HeroInk, MinTouchSize, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { frostedSurface } from './frosted';
import { hasLiquidGlass } from './glass-surface';
import { Icon, type IconName } from './icon';

export type GlassIconButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  icon: IconName;
  /** Required: icon-only buttons have no visible text for screen readers. */
  accessibilityLabel: string;
  iconSize?: number;
  /** Glyph color; defaults to the text color. */
  color?: ThemeColor;
  /** Tints the glass, e.g. `primary` for a main action. */
  tint?: ThemeColor;
  /**
   * `dark`: dark glass with a white glyph, for screens over a photo, which are dark in both
   * themes. `theme` (default) follows the app's light or dark mode.
   */
  appearance?: 'theme' | 'dark';
  /** Nudges the glyph sideways, in points, for a glyph that doesn't sit centered in its own box. */
  iconOffsetX?: number;
  /** Glyph color on dark glass (a lit torch's yellow); white by default. */
  iconTint?: string;
  /** The filled-in glyph, for an "on" state. */
  iconFilled?: boolean;
  style?: StyleProp<ViewStyle>;
};

const SIZE = MinTouchSize;

/**
 * A round Liquid Glass button for header actions, like the system's glass toolbar buttons.
 * Without Liquid Glass (older iOS, Android, web), a frosted circle that looks the same: a
 * see-through fill, a fine rim and a soft shadow.
 */
export function GlassIconButton({ icon, iconSize = 20, color = 'text', tint, appearance = 'theme', iconOffsetX = 0, iconFilled = false, iconTint, style, ...rest }: GlassIconButtonProps) {
  const theme = useTheme();
  const dark = appearance === 'dark';
  const nudge = iconOffsetX ? { transform: [{ translateX: iconOffsetX }] } : undefined;
  const glyph = dark ? (
    <Icon name={icon} size={iconSize} tint={iconTint ?? HeroInk.text} filled={iconFilled} style={nudge} />
  ) : (
    <Icon name={icon} size={iconSize} color={color} filled={iconFilled} style={nudge} />
  );
  if (hasLiquidGlass) {
    return (
      // Round like the glass inside it, and a press only scales: fading a glass view's parent drew it as a square.
      <Pressable accessibilityRole="button" hitSlop={4} style={({ pressed }) => [styles.circle, pressed && styles.glassPressed, style]} {...rest}>
        {/* The glass rounds its own corners; it's never clipped, which would flatten it. */}
        <GlassView glassEffectStyle="regular" isInteractive colorScheme={dark ? 'dark' : 'auto'} tintColor={tint ? theme[tint] : undefined} style={styles.circle}>
          {glyph}
        </GlassView>
      </Pressable>
    );
  }
  // The pressable is the frosted circle itself: a shadow drawn by a view inside it was cut off
  // square at the pressable's edges (Android clips to them in a screen header).
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={4}
      style={({ pressed }) => [styles.circle, dark ? styles.darkFallback : tint ? { backgroundColor: theme[tint] } : frostedSurface(theme), pressed && styles.pressed, style]}
      {...rest}>
      {glyph}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  circle: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  darkFallback: {
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderColor: HeroInk.glassBorder,
  },
  pressed: {
    opacity: 0.7,
  },
  glassPressed: {
    transform: [{ scale: 0.96 }],
  },
});
