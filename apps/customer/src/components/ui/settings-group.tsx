import { useIsFocused } from 'expo-router';
import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';

import { Card } from './card';
import { Divider } from './divider';

export type SettingsGroupProps = {
  title?: string;
  /** Short explanation under the group, like iOS Settings footers. */
  footer?: string;
  /** Inset dividers to align with row text when rows have leading icons. */
  insetDividers?: boolean;
  children: ReactNode;
};

/**
 * When a row inside grows or shrinks (a section opening), the groups below slide rather than jump.
 * Only while the screen is in front: a change made under a sheet (Pro turning on behind the
 * paywall) animated there on Android left groups drawn where they were, overlapping (2026-10-18).
 */
const DURATION = 180;
const SLIDE = LinearTransition.duration(DURATION);

/** Grouped-list section: small caps header, one card of rows with dividers between them, optional footer note. */
export function SettingsGroup({ title, footer, insetDividers = true, children }: SettingsGroupProps) {
  const rows = Children.toArray(children).filter(isValidElement);
  const inFront = useIsFocused();
  return (
    <Animated.View layout={inFront ? SLIDE : undefined} style={styles.group}>
      {title && (
        <ThemedText type="caption" themeColor="textSecondary" style={styles.title} accessibilityRole="header">
          {title}
        </ThemedText>
      )}
      <Card padded={false}>
        {/* The rows are clipped to the card's corners (the card itself can't be: it would cut off its shadow), so a pressed first or last row never shows a square corner. */}
        <View style={styles.clip}>
          {rows.map((row, index) => (
            <Fragment key={row.key ?? index}>
              {index > 0 && <Divider inset={insetDividers} />}
              {row}
            </Fragment>
          ))}
        </View>
      </Card>
      {footer && (
        <ThemedText type="caption" themeColor="textSecondary" style={styles.footer}>
          {footer}
        </ThemedText>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  clip: {
    borderRadius: Radius.card,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  group: {
    gap: Spacing.two,
  },
  title: {
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: Spacing.three,
  },
  footer: {
    paddingHorizontal: Spacing.three,
  },
});
