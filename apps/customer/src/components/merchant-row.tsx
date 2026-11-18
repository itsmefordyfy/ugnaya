import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import type { MerchantSummary } from '@/api/types';
import { MerchantLogo } from '@/components/merchant-logo';
import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { ListRow } from '@/components/ui/list-row';
import { Spacing } from '@/constants/theme';
import { categoryOf } from '@/lib/categories';
import { formatDistance, pointsLabel } from '@/lib/format';

/** A shop in a list: logo, name, category and town (and distance), how many rewards, the customer's points there. */
export function MerchantRow({ merchant }: { merchant: MerchantSummary }) {
  const category = categoryOf(merchant.category).label;
  const where = [category, merchant.city, merchant.distance_km !== null ? formatDistance(merchant.distance_km) : null].filter(Boolean).join(' · ');
  const extra = [merchant.balance ? pointsLabel(merchant.balance) : null, merchant.rewards > 0 ? `${merchant.rewards} ${merchant.rewards === 1 ? 'reward' : 'rewards'}` : null].filter(Boolean).join(' · ');
  return (
    <ListRow
      title={merchant.trade_name}
      subtitle={where}
      leading={<MerchantLogo path={merchant.logo_path} category={merchant.category} />}
      onPress={() => router.push({ pathname: '/merchant/[id]', params: { id: merchant.id } })}
      accessibilityLabel={[merchant.trade_name, where, extra, merchant.favorite ? 'Favorite' : null].filter(Boolean).join(', ')}
      detail={
        extra ? (
          <View style={styles.detail}>
            {merchant.favorite && <Icon name="favorite" filled size={14} color="danger" />}
            <ThemedText type="caption" themeColor="accentText">
              {extra}
            </ThemedText>
          </View>
        ) : merchant.favorite ? (
          <Icon name="favorite" filled size={14} color="danger" />
        ) : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
});
