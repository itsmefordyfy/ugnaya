import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type BadgeProps = {
  label: string;
  color: ThemeColor;
  background: ThemeColor;
  style?: StyleProp<ViewStyle>;
};

/**
 * Status as a dot + label + color, so meaning never rests on color alone. The pill keeps its own
 * size inside a plain wrapper that takes the parent's alignment: centred beside a row's text however
 * many lines it wraps to (a pill set to the top edge sat high there), and not stretched in a column.
 */
export function Badge({ label, color, background, style }: BadgeProps) {
  const theme = useTheme();
  return (
    <View style={style}>
      <View style={[styles.badge, { backgroundColor: theme[background] }]}>
        <View style={[styles.dot, { backgroundColor: theme[color] }]} />
        <ThemedText type="caption" themeColor={color}>
          {label}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.pill,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
