import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { IconName } from '@/components/ui/icon';
import { IconTile } from '@/components/ui/icon-tile';
import { Spacing, type Tone } from '@/constants/theme';

export type PromptCardProps = {
  icon: IconName;
  tone?: Tone;
  title: string;
  message: string;
  actionLabel: string;
  onAction: () => void;
  dismissLabel?: string;
  onDismiss?: () => void;
};

/** A card that explains why the app would like something (notifications, location) before the system asks. */
export function PromptCard({ icon, tone = 'navy', title, message, actionLabel, onAction, dismissLabel = 'Not now', onDismiss }: PromptCardProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <IconTile icon={icon} tone={tone} />
        <View style={styles.text}>
          <ThemedText type="heading">{title}</ThemedText>
          <ThemedText type="secondary" themeColor="textSecondary">
            {message}
          </ThemedText>
        </View>
      </View>
      <View style={styles.actions}>
        {onDismiss && <Button title={dismissLabel} variant="ghost" size="small" onPress={onDismiss} />}
        <Button title={actionLabel} size="small" variant="secondary" onPress={onAction} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  text: {
    flex: 1,
    gap: Spacing.one,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing.three,
  },
});
