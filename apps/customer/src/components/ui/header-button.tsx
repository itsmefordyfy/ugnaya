import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MinTouchSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Button } from './button';
import { frostedSurface } from './frosted';
import { HeaderControl } from './header-control';

export type HeaderButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  title: string;
};

/**
 * A text button in a screen's native header (Save, Cancel). iOS 26 draws its own glass capsule
 * around header buttons, so there it's a plain text button; Android's header draws nothing, so
 * there it's the same capsule, frosted, to match the iPhone.
 */
export function HeaderButton({ title, ...rest }: HeaderButtonProps) {
  const theme = useTheme();
  if (process.env.EXPO_OS === 'ios') return <Button title={title} variant="ghost" size="small" {...rest} />;
  return (
    <HeaderControl>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        hitSlop={6}
        style={({ pressed }) => [styles.capsule, frostedSurface(theme), pressed && styles.pressed, rest.disabled && styles.disabled]}
        {...rest}>
        <ThemedText type="secondarySemiBold" themeColor="primaryText">
          {title}
        </ThemedText>
      </Pressable>
    </HeaderControl>
  );
}

const styles = StyleSheet.create({
  capsule: {
    minHeight: MinTouchSize - 8,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.4,
  },
});
