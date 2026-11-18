import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import type { Activity } from '@/api/types';
import { ThemedText } from '@/components/themed-text';
import { ListRow } from '@/components/ui/list-row';
import type { IconName } from '@/components/ui/icon';
import type { Tone } from '@/constants/theme';
import { formatWhen, signedPoints } from '@/lib/format';

/** What a transaction is, in words, with its icon and tone. */
export function describeActivity(item: Activity): { title: string; icon: IconName; tone: Tone } {
  if (item.status === 'voided') return { title: `Reversed at ${item.merchant}`, icon: 'undo', tone: 'neutral' };
  switch (item.type) {
    case 'award':
      return { title: `Earned at ${item.merchant}`, icon: 'add_circle', tone: 'teal' };
    case 'redeem':
      return { title: item.reward ? `${item.reward}` : `Redeemed at ${item.merchant}`, icon: 'redeem', tone: 'navy' };
    case 'void':
      return { title: `Reversal at ${item.merchant}`, icon: 'undo', tone: 'neutral' };
    case 'adjustment':
      return { title: `Adjustment at ${item.merchant}`, icon: 'tune', tone: 'amber' };
  }
}

/** One transaction in a history: what happened, where and when, and the points (+ in teal, − in the text color). */
export function ActivityRow({ item }: { item: Activity }) {
  const look = describeActivity(item);
  const subtitle = [item.type === 'redeem' && item.reward ? item.merchant : null, formatWhen(item.created_at)].filter(Boolean).join(' · ');
  return (
    <ListRow
      title={look.title}
      subtitle={subtitle}
      icon={look.icon}
      tone={look.tone}
      showChevron={false}
      onPress={() => router.push({ pathname: '/activity/[id]', params: { id: item.id } })}
      accessibilityLabel={`${look.title}, ${subtitle}, ${signedPoints(item.points)} points`}
      trailing={
        <ThemedText type="bodySemiBold" tabular themeColor={item.points > 0 ? 'accentText' : 'text'} style={[styles.points, item.status === 'voided' && styles.voided]}>
          {signedPoints(item.points)}
        </ThemedText>
      }
    />
  );
}

const styles = StyleSheet.create({
  points: {
    textAlign: 'right',
  },
  voided: {
    textDecorationLine: 'line-through',
  },
});
