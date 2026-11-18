import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MinTouchSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { tapFeedback } from '@/lib/haptics';

export type SegmentOption<T extends string> = {
  value: T;
  label: string;
  /** A count after the label (e.g. how many are listed there); left out when absent. */
  count?: number;
};

export type SegmentedControlProps<T extends string> = {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** What the segments switch between, for screen readers. */
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Two or three views of one screen side by side, the picked one raised on a solid pill (the
 * iPhone's segmented control, drawn the same on Android). Solid, not glass: it sits in content.
 */
export function SegmentedControl<T extends string>({ options, value, onChange, accessibilityLabel, style }: SegmentedControlProps<T>) {
  const theme = useTheme();
  return (
    <View accessibilityRole="tablist" accessibilityLabel={accessibilityLabel} style={[styles.track, { backgroundColor: theme.tabSelected }, style]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={option.count !== undefined ? `${option.label}, ${option.count}` : option.label}
            onPress={() => {
              if (selected) return;
              tapFeedback();
              onChange(option.value);
            }}
            style={({ pressed }) => [styles.segment, selected && [styles.selected, { backgroundColor: theme.backgroundElement }], pressed && !selected && styles.pressed]}>
            <ThemedText type="secondarySemiBold" themeColor={selected ? 'text' : 'textSecondary'} numberOfLines={1}>
              {option.label}
              {option.count !== undefined && (
                <ThemedText type="secondary" themeColor="textSecondary" tabular>
                  {`  ${option.count}`}
                </ThemedText>
              )}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    padding: Spacing.half,
    borderRadius: Radius.pill,
    borderCurve: 'continuous',
  },
  segment: {
    flex: 1,
    minHeight: MinTouchSize - Spacing.one,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    borderCurve: 'continuous',
  },
  selected: {
    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.12)',
  },
  pressed: {
    opacity: 0.6,
  },
});
