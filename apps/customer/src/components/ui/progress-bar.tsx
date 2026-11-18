import { StyleSheet, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ProgressBarProps = {
  /** 0 to 1. */
  fraction: number;
  /** "3 of 5 days", read out with the bar. */
  accessibilityLabel: string;
  /** The goal is met: drawn in the "ok" color. */
  done?: boolean;
};

const HEIGHT = 8;

/** A slim progress bar toward a goal (points toward a reward). */
export function ProgressBar({ fraction, accessibilityLabel, done = false }: ProgressBarProps) {
  const theme = useTheme();
  const clamped = Math.min(1, Math.max(0, Number.isFinite(fraction) ? fraction : 0));
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={accessibilityLabel} accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }} style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
      <View style={[styles.fill, { width: `${clamped * 100}%`, backgroundColor: done ? theme.statusOk : theme.accent }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: HEIGHT,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: HEIGHT,
    borderRadius: Radius.pill,
  },
});
