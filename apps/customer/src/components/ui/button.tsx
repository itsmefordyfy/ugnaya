import { GlassView } from 'expo-glass-effect';
import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ButtonHeight, ButtonHeightSmall, IconSize, Radius, Spacing, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { hasLiquidGlass } from './glass-surface';
import { Icon, type IconName } from './icon';

/**
 * `primary`: navy with white ink (ivory with navy ink in dark mode), the one main action on a screen. `secondary`: the navy
 * soft tile with its ink (supporting actions). `outline`: a white surface with a border (a quiet
 * alternative beside a primary). `ghost`: text only. `danger`: delete and remove.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'medium' | 'small';
/**
 * `glass` (the default): primary is mint-tinted Liquid Glass on iOS 26. `solid`: the same colors as
 * a plain fill, for buttons inside something that fades in: iOS can leave a glass effect created
 * inside a fading view invisible, label and all.
 */
export type ButtonMaterial = 'glass' | 'solid';

export type ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  loading?: boolean;
  material?: ButtonMaterial;
  style?: StyleProp<ViewStyle>;
};

type Look = { fill: string | null; ink: string; border?: string };

function lookFor(variant: ButtonVariant, theme: ThemeColors, sage: { ink: string; soft: string }): Look {
  switch (variant) {
    case 'primary':
      return { fill: theme.primary, ink: theme.onPrimary };
    case 'secondary':
      return { fill: sage.soft, ink: sage.ink };
    case 'outline':
      return { fill: theme.backgroundElement, ink: theme.text, border: theme.border };
    case 'ghost':
      return { fill: null, ink: theme.primaryText };
    case 'danger':
      return { fill: theme.statusDangerSoft, ink: theme.danger };
  }
}

export function Button({ title, variant = 'primary', size = 'medium', icon, loading = false, material = 'glass', disabled, style, ...rest }: ButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;
  // Disabled reads as disabled by color, not just a fade: a neutral fill and the muted ink.
  const look: Look = disabled && variant !== 'ghost' ? { fill: theme.backgroundSelected, ink: theme.textTertiary } : lookFor(variant, theme, { ink: theme.primaryText, soft: theme.primarySoft });
  const glass = hasLiquidGlass && material === 'glass' && variant === 'primary' && !disabled;
  const small = size === 'small';

  // A ghost button has no surface, so no visible padding: its label lines up with the content
  // beside it. The room the padding gave the finger comes back as hit slop.
  const bare = variant === 'ghost';
  const padding = small ? Spacing.three : Spacing.four;
  const content = (
    <View style={[styles.content, !bare && { paddingHorizontal: padding }]}>
      {loading ? <ActivityIndicator size="small" color={look.ink} /> : icon && <Icon name={icon} size={small ? IconSize.small : IconSize.medium} tint={look.ink} />}
      <ThemedText type={small ? 'secondarySemiBold' : 'button'} style={[styles.label, { color: look.ink }]} numberOfLines={2}>
        {title}
      </ThemedText>
    </View>
  );

  const a11y = {
    accessibilityRole: 'button' as const,
    accessibilityLabel: title,
    accessibilityState: { disabled: !!isDisabled, busy: loading },
    disabled: isDisabled,
  };

  if (glass) {
    return (
      // The pressable has the button's own rounded shape, and a press only scales it: fading the
      // parent of a glass view (opacity) made iOS draw the glass as a square box while pressed.
      <Pressable
        {...a11y}
        hitSlop={small ? 8 : undefined}
        style={({ pressed }) => [styles.glassPressable, small ? styles.small : styles.medium, pressed && styles.glassPressed, style]}
        {...rest}>
        {/* The glass shapes itself from borderRadius; it's never clipped, which would flatten it. */}
        <GlassView glassEffectStyle="regular" isInteractive tintColor={look.fill ?? undefined} style={[styles.base, small ? styles.small : styles.medium, styles.glass]}>
          {content}
        </GlassView>
      </Pressable>
    );
  }

  return (
    <Pressable
      {...a11y}
      hitSlop={bare ? { left: padding, right: padding, top: small ? 8 : 0, bottom: small ? 8 : 0 } : small ? 8 : undefined}
      style={({ pressed }) => [
        styles.base,
        small ? styles.small : styles.medium,
        look.fill !== null && { backgroundColor: look.fill },
        look.border && { borderWidth: 1, borderColor: look.border },
        pressed && styles.pressed,
        style,
      ]}
      {...rest}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.button,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  medium: {
    minHeight: ButtonHeight,
  },
  small: {
    minHeight: ButtonHeightSmall,
    borderRadius: Radius.chip,
  },
  // Fills the button's width only; growing in height let a centered button swell to fill a screen.
  glass: {
    alignSelf: 'stretch',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  // A label that wraps (large text, a long translation) stays centered.
  label: {
    flexShrink: 1,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  glassPressable: {
    borderRadius: Radius.button,
    borderCurve: 'continuous',
  },
  glassPressed: {
    transform: [{ scale: 0.98 }],
  },
});
