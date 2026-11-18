import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { requestVoucher, useReward } from '@/api/customer';
import { MerchantLogo } from '@/components/merchant-logo';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Notice } from '@/components/ui/notice';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Screen } from '@/components/ui/screen';
import { ErrorState, LoadingState, NotFoundState } from '@/components/ui/state-view';
import { Spacing } from '@/constants/theme';
import { useMe } from '@/api/session';
import { errorMessage } from '@/lib/errors';
import { formatPoints, pointsLabel } from '@/lib/format';
import { tapFeedback } from '@/lib/haptics';

import { keepVoucher } from '../voucher-store';
import { eligibilityText } from './reward-card';

/**
 * A reward: what it is, where, its cost against the customer's points there, and Redeem. Redeem makes a one-time voucher code
 * (5 minutes) for the cashier to scan; points are taken only at that scan, so an unused code costs nothing.
 */
export function RewardScreen() {
  const { id, merchantId } = useLocalSearchParams<{ id: string; merchantId?: string }>();
  const me = useMe();
  const queryClient = useQueryClient();
  const reward = useReward(id, merchantId ?? null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  if (reward.isPending) return <LoadingState />;
  if (reward.isError && !reward.data) return <ErrorState message={errorMessage(reward.error)} onRetry={() => void reward.refetch()} />;
  const data = reward.data;
  if (!data) return <NotFoundState icon="redeem" title="Reward not available" message="The shop may have changed or removed it." />;

  const fraction = data.points_cost > 0 ? Math.min(1, data.balance / data.points_cost) : 1;

  const issue = async () => {
    setBusy(true);
    setFailure(null);
    try {
      const issued = await requestVoucher(data.id);
      const voucher = keepVoucher({
        code: issued.redemptionCode,
        rewardId: data.id,
        rewardName: issued.rewardName || data.name,
        merchant: data.merchant,
        pointsCost: issued.pointsCost ?? data.points_cost,
        expiresAt: issued.expiresAt,
        issuedAt: new Date().toISOString(),
      });
      void queryClient.invalidateQueries({ queryKey: ['redemptions', me] });
      router.push({ pathname: '/voucher', params: { key: voucher.key } });
    } catch (error) {
      setFailure(errorMessage(error));
      void reward.refetch();
    } finally {
      setBusy(false);
    }
  };

  const confirm = () => {
    tapFeedback();
    Alert.alert(
      `Redeem ${data.name}?`,
      `You’ll get a code to show the cashier at ${data.merchant}. It works for 5 minutes. ${pointsLabel(data.points_cost)} are taken only when the cashier scans it.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Get my code', isPreferred: true, onPress: () => void issue() },
      ],
    );
  };

  return (
    <Screen footer={<Button title={data.eligible ? 'Redeem at the counter' : eligibilityText(data)} icon={data.eligible ? 'redeem' : undefined} disabled={!data.eligible} loading={busy} onPress={confirm} />}>
      <Card style={styles.hero}>
        <View style={styles.shop}>
          <MerchantLogo path={data.logo_path} category={null} />
          <ThemedText type="secondarySemiBold" themeColor="textSecondary" onPress={() => router.push({ pathname: '/merchant/[id]', params: { id: data.merchant_id } })}>
            {data.merchant}
          </ThemedText>
        </View>
        <ThemedText type="title" accessibilityRole="header">
          {data.name}
        </ThemedText>
        {data.description && (
          <ThemedText type="body" themeColor="textSecondary">
            {data.description}
          </ThemedText>
        )}
      </Card>
      <Card style={styles.points}>
        <View style={styles.row}>
          <View>
            <ThemedText type="overline" themeColor="textSecondary">
              COSTS
            </ThemedText>
            <ThemedText type="statSmall" tabular>
              {pointsLabel(data.points_cost)}
            </ThemedText>
          </View>
          <View style={styles.right}>
            <ThemedText type="overline" themeColor="textSecondary">
              YOU HAVE HERE
            </ThemedText>
            <ThemedText type="statSmall" tabular themeColor="accentText">
              {formatPoints(data.balance)}
            </ThemedText>
          </View>
        </View>
        <ProgressBar fraction={fraction} done={data.eligible} accessibilityLabel={eligibilityText(data)} />
        <ThemedText type="caption" themeColor={data.eligible ? 'accentText' : 'textSecondary'}>
          {eligibilityText(data)}
        </ThemedText>
      </Card>
      {failure && <Notice tone="danger" message={failure} />}
      <ThemedText type="caption" themeColor="textSecondary">
        Points from this shop are spent at this shop. Your voucher code works once, for 5 minutes, and only at the counter.
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: Spacing.two,
  },
  shop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  points: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  right: {
    alignItems: 'flex-end',
  },
});
