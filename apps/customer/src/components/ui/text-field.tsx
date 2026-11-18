import type { ReactNode } from 'react';
import { StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { InputHeight, Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { sanitizeNumeric, type NumericMode } from '@/lib/numeric';

export type TextFieldProps = Omit<TextInputProps, 'style' | 'keyboardType'> & {
  label: string;
  /**
   * Restricts input to digits (`integer`) or digits with one decimal point (`decimal`). Filters
   * typed and pasted text, and picks the matching keypad.
   */
  numeric?: NumericMode;
  keyboardType?: TextInputProps['keyboardType'];
  hint?: string;
  error?: string | null;
  /** Unit or currency shown inside the field, e.g. "kg" or "₱". */
  suffix?: string;
  /** Control at the end of the field. */
  trailing?: ReactNode;
  /**
   * The label is drawn by the screen instead (above a row that puts a button beside the box, so the
   * button can line up with the box). Screen readers still hear `label`.
   */
  labelHidden?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function TextField({ label, hint, error, suffix, trailing, labelHidden = false, style, multiline, numeric, keyboardType, onChangeText, editable, ...rest }: TextFieldProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, style]}>
      {!labelHidden && (
        <ThemedText type="secondarySemiBold" themeColor="textSecondary">
          {label}
        </ThemedText>
      )}
      <View
        style={[
          styles.inputRow,
          // A soft neutral fill inside white cards; the border turns red with an error.
          { backgroundColor: theme.backgroundSelected, borderColor: error ? theme.danger : theme.border },
          multiline && styles.multilineRow,
          editable === false && styles.disabled,
        ]}>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={theme.textTertiary}
          selectionColor={theme.primary}
          multiline={multiline}
          editable={editable}
          keyboardType={numeric === 'integer' ? 'number-pad' : numeric === 'decimal' ? 'decimal-pad' : keyboardType}
          inputMode={numeric === 'integer' ? 'numeric' : numeric === 'decimal' ? 'decimal' : undefined}
          onChangeText={numeric && onChangeText ? (text) => onChangeText(sanitizeNumeric(text, numeric)) : onChangeText}
          style={[styles.input, { color: theme.text }, multiline ? styles.multilineInput : styles.singleLineInput]}
          {...rest}
        />
        {suffix && (
          <ThemedText type="secondary" themeColor="textSecondary">
            {suffix}
          </ThemedText>
        )}
        {trailing}
      </View>
      {error ? (
        <ThemedText type="caption" themeColor="danger">
          {error}
        </ThemedText>
      ) : (
        hint && (
          <ThemedText type="caption" themeColor="textSecondary">
            {hint}
          </ThemedText>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: InputHeight,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.input,
    borderCurve: 'continuous',
    borderWidth: 1,
  },
  multilineRow: {
    alignItems: 'flex-start',
    paddingVertical: Spacing.two,
  },
  input: {
    flex: 1,
    fontFamily: Typography.body.fontFamily,
    fontSize: Typography.body.fontSize,
    includeFontPadding: false,
    // No vertical padding or height on single-line inputs: the row's minHeight sets the
    // touch target. Either one makes iOS mis-measure a long placeholder and clip it.
  },
  // The whole row's height, from layout rather than a style height: left to its own measured text
  // height, an input focused while its sheet is still sliding up (autoFocus) was measured short on
  // iOS and drew its placeholder clipped to the bottom of the letters. UIKit centers the text.
  singleLineInput: {
    alignSelf: 'stretch',
  },
  disabled: {
    opacity: 0.5,
  },
  multilineInput: {
    paddingVertical: Spacing.two,
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
