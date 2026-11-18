import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useActivityItem } from '@/api/customer';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Divider } from '@/components/ui/divider';
import { FactRow } from '@/components/ui/fact-row';
import { IconTile } from '@/components/ui/icon-tile';
import { Screen } from '@/components/ui/screen';
import { ErrorState, LoadingState, NotFoundState } from '@/components/ui/state-view';
import { Radius, Spacing } from '@/constants/theme';
import { errorMessage } from '@/lib/errors';
import { formatDateTime, formatPesos, signedPoints } from '@/lib/format';

import { describeActivity } from '@/components/activity-row';

const TYPE_LABEL = { award: 'Points earned', redeem: 'Reward redeemed', void: 'Reversal', adjustment: 'Adjustment' } as const;

/** One transaction: what, where, when, the amount and receipt, and how the points split between the shop and the network. */
export function ActivityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = useActivityItem(id);

  if (item.isPending) return <LoadingState />;
  if (item.isError && !item.data) return <ErrorState message={errorMessage(item.error)} onRetry={() => void item.refetch()} />;
  const data = item.data;
  if (!data) return <NotFoundState icon="receipt_long" title="Transaction not found" message="It may be older than your recent history." />;

  const look = describeActivity(data);
  return (
    <Screen>
      <Card style={styles.hero}>
        <IconTile icon={look.icon} tone={look.tone} size={56} />
        <ThemedText type="secondarySemiBold" themeColor="textSecondary">
          {data.status === 'voided' ? 'Reversed' : TYPE_LABEL[data.type]}
        </ThemedText>
        <ThemedText type="hero" tabular themeColor={data.points > 0 ? 'accentText' : 'text'} style={data.status === 'voided' && styles.voided}>
          {`${signedPoints(data.points)} pts`}
        </ThemedText>
        <ThemedText type="heading" style={styles.center}>
          {data.reward ?? data.merchant}
        </ThemedText>
      </Card>
      <Card padded={false}>
        <View style={styles.clip}>
          <FactRow label="Shop" value={data.merchant} onPress={() => router.push({ pathname: '/merchant/[id]', params: { id: data.merchant_id } })} />
          {data.branch && (
            <>
              <Divider />
              <FactRow label="Branch" value={data.branch} />
            </>
          )}
          <Divider />
          <FactRow label="When" value={formatDateTime(data.created_at)} />
          {data.amount_centavos !== null && data.amount_centavos > 0 && (
            <>
              <Divider />
              <FactRow label="Purchase" value={formatPesos(data.amount_centavos)} />
            </>
          )}
          {data.receipt_no && (
            <>
              <Divider />
              <FactRow label="Receipt" value={data.receipt_no} />
            </>
          )}
          <Divider />
          <FactRow label="Shop points" value={signedPoints(data.merchant_points)} />
          {data.network_points !== 0 && (
            <>
              <Divider />
              <FactRow label="Network points" value={signedPoints(data.network_points)} />
            </>
          )}
          {data.reason && (
            <>
              <Divider />
              <FactRow label="Reason" value={data.reason} />
            </>
          )}
        </View>
      </Card>
      {data.status === 'voided' && (
        <ThemedText type="secondary" themeColor="textSecondary">
          The shop reversed this transaction, and your balance was corrected.
        </ThemedText>
      )}
      <Button title="Something wrong? Contact us" variant="ghost" size="small" onPress={() => router.push('/settings/help')} style={styles.help} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  center: {
    textAlign: 'center',
  },
  voided: {
    textDecorationLine: 'line-through',
  },
  clip: {
    borderRadius: Radius.card,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  help: {
    alignSelf: 'center',
  },
});
