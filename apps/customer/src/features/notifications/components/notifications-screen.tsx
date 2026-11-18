import { router, Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useMarkRead, useNotifications } from '@/api/customer';
import type { InAppNotification } from '@/api/types';
import { PagedList } from '@/components/paged-list';
import { ThemedText } from '@/components/themed-text';
import { Ugi } from '@/components/ugi';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ListRow } from '@/components/ui/list-row';
import type { IconName } from '@/components/ui/icon';
import { Radius, Spacing, type Tone } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatWhen } from '@/lib/format';

const KINDS: Record<string, { icon: IconName; tone: Tone }> = {
  points_earned: { icon: 'add_circle', tone: 'teal' },
  reward_redeemed: { icon: 'redeem', tone: 'navy' },
  transaction_voided: { icon: 'undo', tone: 'neutral' },
  points_adjusted: { icon: 'tune', tone: 'amber' },
  points_expired: { icon: 'hourglass_bottom', tone: 'red' },
  points_expiring: { icon: 'hourglass_top', tone: 'amber' },
  offer: { icon: 'local_offer', tone: 'rose' },
};

function open(item: InAppNotification): void {
  if (item.data?.transaction_id) router.push({ pathname: '/activity/[id]', params: { id: item.data.transaction_id } });
  else if (item.data?.merchant_id) router.push({ pathname: '/merchant/[id]', params: { id: item.data.merchant_id } });
}

/** In-app notifications, newest first. Opening one marks it read; Mark all read clears the bell. */
export function NotificationsScreen() {
  const theme = useTheme();
  const query = useNotifications();
  const markRead = useMarkRead();
  const items = query.data?.pages.flat() ?? [];
  const anyUnread = items.some((item) => !item.read_at);

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: anyUnread ? () => <Button title="Mark all read" variant="ghost" size="small" onPress={() => markRead.mutate('all')} /> : undefined,
        }}
      />
      <PagedList<InAppNotification>
        query={query}
        keyOf={(item) => item.id}
        renderItem={(item) => {
          const look = KINDS[item.kind ?? ''] ?? { icon: 'notifications', tone: 'navy' };
          const unread = !item.read_at;
          return (
            <ListRow
              title={item.title ?? 'UGNAYA'}
              titleLines={2}
              subtitle={item.body ?? undefined}
              icon={look.icon}
              tone={look.tone}
              showChevron={!!(item.data?.transaction_id || item.data?.merchant_id)}
              accessibilityLabel={`${unread ? 'Unread. ' : ''}${item.title ?? ''}. ${item.body ?? ''}. ${formatWhen(item.created_at)}`}
              onPress={() => {
                if (unread) markRead.mutate([item.id]);
                open(item);
              }}
              detail={
                <ThemedText type="caption" themeColor="textTertiary">
                  {formatWhen(item.created_at)}
                </ThemedText>
              }
              trailing={unread ? <View style={[styles.dot, { backgroundColor: theme.accent }]} /> : undefined}
            />
          );
        }}
        empty={
          <EmptyState
            illustration={<Ugi pose="wink" size={110} />}
            title="All quiet"
            message="When you earn points, redeem a reward, or points are about to expire, it shows here."
          />
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  dot: {
    width: 10,
    height: 10,
    borderRadius: Radius.pill,
    marginLeft: Spacing.one,
  },
});
