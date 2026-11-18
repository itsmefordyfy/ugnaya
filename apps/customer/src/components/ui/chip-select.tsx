import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MinTouchSize, Radius, Spacing, type Tone } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTones } from '@/hooks/use-tones';

import { Icon, type IconName } from './icon';

export type ChipOption<T extends string> = {
  value: T;
  label: string;
  icon?: IconName;
  /** A category's color (a record kind, an expense category): its icon always, and the chip when chosen. */
  tone?: Tone;
  /** A small illustration in place of `icon` (a pet's species); decorative, the label names it. */
  leading?: ReactNode;
};

type Common<T extends string> = {
  label?: string;
  options: readonly ChipOption<T>[];
  /** Wrap onto multiple lines instead of scrolling horizontally. */
  wrap?: boolean;
  /** Wrapped rows only: lined up from the start (the default), or centered under centered content. */
  align?: 'start' | 'center';
  /** Scrolling rows only: space before the first chip and after the last, so they can scroll edge to edge. */
  inset?: number;
  /** `multiple` only: false drops the check on chosen chips (a filter row), leaving the tint and border to show them. */
  checkmarks?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** One choice (a species, a record kind), or `multiple` for any number. */
export type ChipSelectProps<T extends string> = Common<T> &
  ({ multiple?: false; /** Null: nothing chosen yet (a required choice not made). */ value: T | null; onChange: (value: T) => void } | { multiple: true; value: readonly T[]; onChange: (value: T[]) => void });

/** Solid tonal chips (content, not controls): a filter, a form's options. */
export function ChipSelect<T extends string>(props: ChipSelectProps<T>) {
  const { label, options, wrap = false, align = 'start', inset = 0, checkmarks = true, style } = props;
  const theme = useTheme();
  const tones = useTones();

  const isSelected = (option: T) => (props.multiple ? props.value.includes(option) : props.value === option);
  const press = (option: T) => {
    if (props.multiple) props.onChange(props.value.includes(option) ? props.value.filter((value) => value !== option) : [...props.value, option]);
    else props.onChange(option);
  };

  const chips = options.map((option) => {
    const selected = isSelected(option.value);
    const tone = option.tone && tones[option.tone];
    return (
      <Pressable
        key={option.value}
        accessibilityRole={props.multiple ? 'checkbox' : 'radio'}
        accessibilityState={props.multiple ? { checked: selected } : { selected }}
        accessibilityLabel={option.label}
        onPress={() => press(option.value)}
        style={({ pressed }) => [
          styles.chip,
          // A long name (a pet's) shortens to one line inside the row instead of running off the screen.
          wrap && styles.wrapChip,
          { backgroundColor: selected ? (tone?.soft ?? theme.primarySoft) : theme.backgroundElement, borderColor: selected ? (tone?.ink ?? theme.primary) : theme.border },
          pressed && styles.pressed,
        ]}>
        {/* A multi-select chip shows a check when on, so its state never rests on color alone. */}
        {props.multiple && selected && checkmarks ? (
          <Icon name="check" size={14} color="primary" tint={tone?.ink} />
        ) : (
          (option.leading ?? (option.icon && <Icon name={option.icon} size={14} color={selected ? 'primary' : 'textSecondary'} tint={tone?.ink} />))
        )}
        <ThemedText type="secondarySemiBold" themeColor={selected ? 'primary' : 'textSecondary'} numberOfLines={1} style={[styles.chipLabel, selected && tone && { color: tone.ink }]}>
          {option.label}
        </ThemedText>
      </Pressable>
    );
  });

  return (
    <View style={[styles.container, style]} accessibilityRole={props.multiple ? undefined : 'radiogroup'}>
      {label && (
        <ThemedText type="secondarySemiBold" themeColor="textSecondary">
          {label}
        </ThemedText>
      )}
      {wrap ? (
        <View style={[styles.wrap, align === 'center' && styles.centered]}>{chips}</View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.row, { paddingHorizontal: inset }]}>
          {chips}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
  },
  row: {
    gap: Spacing.two,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  centered: {
    justifyContent: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    // The full 44pt target: chips wrap 8pt apart, too close to extend the hit area with hitSlop.
    minHeight: MinTouchSize,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  wrapChip: {
    maxWidth: '100%',
  },
  chipLabel: {
    flexShrink: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});
