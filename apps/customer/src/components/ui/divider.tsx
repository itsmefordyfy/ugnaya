import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type DividerProps = {
  /** Starts past a row's leading icon, so the line meets the text like iOS grouped lists. */
  inset?: boolean;
};

export function Divider({ inset = false }: DividerProps) {
  const theme = useTheme();
  return <View style={[styles.divider, { backgroundColor: theme.border }, inset && styles.inset]} />;
}

const styles = StyleSheet.create({
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  inset: {
    marginLeft: Spacing.three + 36 + Spacing.three,
  },
});
