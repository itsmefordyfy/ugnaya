import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useStrings } from '@/hooks/use-strings';
import { useTheme } from '@/hooks/use-theme';

import { Button } from './button';
import { EmptyState } from './empty-state';
import type { IconName } from './icon';

/** How long a load may take before the spinner shows; local reads finish well within it. */
const SPINNER_DELAY_MS = 400;

/**
 * A screen still loading. Reads are local and usually done in a few milliseconds, so the spinner
 * waits a moment before it shows: a sheet sliding up stays still inside instead of flashing a
 * spinner that's gone before it finishes opening.
 */
export function LoadingState() {
  const theme = useTheme();
  const [showSpinner, setShowSpinner] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShowSpinner(true), SPINNER_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);
  return <View style={[styles.center, { backgroundColor: theme.background }]}>{showSpinner && <ActivityIndicator color={theme.primary} />}</View>;
}

export type ErrorStateProps = { message?: string; onRetry?: () => void };

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  const theme = useTheme();
  const strings = useStrings();
  return (
    <View style={[styles.center, { backgroundColor: theme.background }]}>
      <ThemedText type="cardTitle">{strings.common.somethingWrong}</ThemedText>
      <ThemedText type="secondary" themeColor="textSecondary" style={styles.message}>
        {message ?? strings.common.dataSafe}
      </ThemedText>
      {onRetry && <Button title={strings.common.tryAgain} variant="secondary" onPress={onRetry} />}
    </View>
  );
}

export type NotFoundStateProps = { icon?: IconName; title: string; message?: string };

/** A screen opened for a record that's gone: centered in the screen, like the loading and error states. */
export function NotFoundState({ icon = 'help', title, message }: NotFoundStateProps) {
  const theme = useTheme();
  return (
    <View style={[styles.center, { backgroundColor: theme.background }]}>
      <EmptyState icon={icon} title={title} message={message} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
  },
  message: {
    textAlign: 'center',
  },
});
