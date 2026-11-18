import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import type { Reward } from '@/api/types';
import { MerchantLogo } from '@/components/merchant-logo';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Spacing } from '@/constants/theme';
import { formatPoints, pointsLabel } from '@/lib/format';

export const REWARD_CARD_WIDTH = 220;

/** "Ready to redeem", "Out of stock", or how many points to go. */
export function eligibilityText(reward: Pick<Reward, 'eligible' | 'in_stock' | 'balance' | 'points_cost'>): string {
  if (!reward.in_stock) return 'Out of stock';
  if (reward.eligible) return 'Ready to redeem';
  return `${pointsLabel(Math.max(0, reward.points_cost - reward.balance))} to go`;
}

/** A reward as a card (Home's row of rewards): the shop, the reward, its cost and how close the customer is. */
export function RewardCard({ reward, width = REWARD_CARD_WIDTH }: { reward: Reward; width?: number }) {
  const fraction = reward.points_cost > 0 ? Math.min(1, reward.balance / reward.points_cost) : 1;
  return (
    <Card
      onPress={() => router.push({ pathname: '/rewards/[id]', params: { id: reward.id, merchantId: reward.merchant_id } })}
      accessibilityLabel={`${reward.name} at ${reward.merchant}, ${pointsLabel(reward.points_cost)}, ${eligibilityText(reward)}`}
      style={[styles.card, { width }]}>
      <View style={styles.shop}>
        <MerchantLogo path={reward.logo_path} category={null} />
        <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1} style={styles.flex}>
          {reward.merchant}
        </ThemedText>
      </View>
      <ThemedText type="heading" numberOfLines={2} style={styles.name}>
        {reward.name}
      </ThemedText>
      <ThemedText type="statSmall" tabular>
        {formatPoints(reward.points_cost)}
        <ThemedText type="secondary" themeColor="textSecondary">
          {' pts'}
        </ThemedText>
      </ThemedText>
      <ProgressBar fraction={fraction} done={reward.eligible} accessibilityLabel={eligibilityText(reward)} />
      <ThemedText type="caption" themeColor={reward.eligible ? 'accentText' : 'textSecondary'}>
        {eligibilityText(reward)}
      </ThemedText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two,
  },
  shop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
  name: {
    minHeight: 44,
  },
});
