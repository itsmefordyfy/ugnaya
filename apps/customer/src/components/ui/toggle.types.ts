import type { StyleProp, ViewStyle } from 'react-native';

export type ToggleProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  /** Required: a toggle has no visible text of its own for screen readers. */
  accessibilityLabel: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};
