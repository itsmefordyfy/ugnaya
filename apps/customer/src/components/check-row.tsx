import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { MinTouchSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { tapFeedback } from '@/lib/haptics';

export type CheckRowProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** The words beside the box; may hold links. */
  children: ReactNode;
  accessibilityLabel: string;
  error?: boolean;
};

/** A tickable consent line (terms, marketing). Unticked by default: consent is never assumed. */
export function CheckRow({ checked, onChange, children, accessibilityLabel, error }: CheckRowProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
        tapFeedback();
        onChange(!checked);
      }}
      style={styles.row}>
      <View
        style={[
          styles.box,
          { borderColor: error ? theme.danger : checked ? theme.primary : theme.textTertiary, backgroundColor: checked ? theme.primary : 'transparent' },
        ]}>
        {checked && <Icon name="check" size={16} tint={theme.onPrimary} />}
      </View>
      <View style={styles.text}>{children}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: MinTouchSize,
  },
  box: {
    width: 24,
    height: 24,
    borderRadius: Radius.small - 3,
    borderCurve: 'continuous',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
  },
});
