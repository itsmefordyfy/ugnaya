import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { MerchantLogo } from '@/components/merchant-logo';
import { Badge } from '@/components/ui/badge';
import { ListRow } from '@/components/ui/list-row';
import { Spacing } from '@/constants/theme';
import { formatPoints, pointsLabel } from '@/lib/format';

export type RewardRowItem = {
  id: string;
  name: string;
  points_cost: number;
  eligible: boolean;
  in_stock: boolean;
  merchant?: string;
  merchant_id?: string;
  logo_path?: string | null;
  balance?: number;
  first_visit_only?: boolean;
};

/** A reward in a list: its name (and shop), the cost, and whether the customer can redeem it now. */
export function RewardRow({ reward, merchantId }: { reward: RewardRowItem; merchantId?: string }) {
  const shop = reward.merchant_id ?? merchantId;
  const status = !reward.in_stock ? 'Out of stock' : reward.eligible ? 'Ready' : reward.balance !== undefined ? `${formatPoints(Math.max(0, reward.points_cost - reward.balance))} to go` : null;
  return (
    <ListRow
      title={reward.name}
      titleLines={2}
      subtitle={[reward.merchant, pointsLabel(reward.points_cost), reward.first_visit_only ? 'First visit only' : null].filter(Boolean).join(' · ')}
      leading={reward.merchant ? <MerchantLogo path={reward.logo_path} category={null} /> : undefined}
      icon={reward.merchant ? undefined : 'redeem'}
      tone={reward.merchant ? undefined : 'amber'}
      onPress={() => router.push({ pathname: '/rewards/[id]', params: { id: reward.id, ...(shop ? { merchantId: shop } : {}) } })}
      trailing={
        status ? (
          <View style={styles.badge}>
            <Badge label={status} color={reward.eligible ? 'statusOk' : 'textSecondary'} background={reward.eligible ? 'statusOkSoft' : 'backgroundSelected'} />
          </View>
        ) : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  badge: {
    marginLeft: Spacing.one,
  },
});
