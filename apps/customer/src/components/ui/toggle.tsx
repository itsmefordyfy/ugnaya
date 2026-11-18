import { Switch, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

import type { ToggleProps } from './toggle.types';

export type { ToggleProps } from './toggle.types';

/** An on/off switch: the system's own on iOS (and web), in a clear green (not the pale mint, which read as disabled). Android draws the iPhone's (toggle.android). */
export function Toggle({ value, onValueChange, accessibilityLabel, disabled, style }: ToggleProps) {
  const theme = useTheme();
  // In a view that takes the switch's own size: bare, iOS 26's switch (63 × 28) sat a few points above the middle of a row.
  return (
    <View style={style}>
      <Switch
        accessibilityLabel={accessibilityLabel}
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ true: theme.toggleOn, false: theme.toggleOff }}
        ios_backgroundColor={theme.toggleOff}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}
