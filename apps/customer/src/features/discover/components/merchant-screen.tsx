import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { useMerchant, useToggleFavorite } from '@/api/customer';
import type { Branch } from '@/api/types';
import { HeaderIconButton } from '@/components/header-icon-button';
import { MerchantLogo } from '@/components/merchant-logo';
import { ThemedText } from '@/components/themed-text';
import { Ugi } from '@/components/ugi';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Divider } from '@/components/ui/divider';
import { Icon } from '@/components/ui/icon';
import { ListRow } from '@/components/ui/list-row';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { ErrorState, LoadingState } from '@/components/ui/state-view';
import { Radius, Spacing } from '@/constants/theme';
import { useApproxLocation } from '@/hooks/use-approx-location';
import { RewardRow } from '@/components/reward-row';
import { useTheme } from '@/hooks/use-theme';
import { categoryOf } from '@/lib/categories';
import { errorCode, errorMessage } from '@/lib/errors';
import { formatDate, formatDistance, formatPoints, ruleText } from '@/lib/format';
import { tapFeedback } from '@/lib/haptics';
import { hoursLines } from '@/lib/hours';
import { openExternal, openPage } from '@/lib/links';
import { closeScreen } from '@/lib/navigation';

/** Apple Maps (Google Maps on Android) with directions to the branch: by its pin when it has one, else its address. */
function directionsUrl(branch: Branch, shop: string): string | null {
  const place = branch.lat !== null && branch.lng !== null ? `${branch.lat},${branch.lng}` : [branch.address, branch.city].filter(Boolean).join(', ');
  if (!place) return null;
  if (process.env.EXPO_OS === 'android') return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(place)}`;
  return `https://maps.apple.com/?daddr=${encodeURIComponent(place)}&q=${encodeURIComponent(shop)}`;
}

/** A shop: who they are, the customer's points and how to earn more, rewards with eligibility, promotions, branches, contact. */
export function MerchantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const location = useApproxLocation();
  const merchant = useMerchant(id, location.coords);
  const toggle = useToggleFavorite();
  const [refreshing, setRefreshing] = useState(false);

  if (merchant.isPending) return <LoadingState />;
  if (merchant.isError && !merchant.data) {
    if (errorCode(merchant.error) === 'merchant_not_found') {
      return (
        <Screen contentStyle={styles.grow}>
          <Stack.Screen options={{ title: '' }} />
          <View style={styles.missing}>
            <Ugi pose="thinking" size={130} />
            <ThemedText type="section" style={styles.center}>
              This shop isn’t on UGNAYA right now
            </ThemedText>
            <ThemedText type="body" themeColor="textSecondary" style={styles.center}>
              It may have paused its program. Any points you have there are kept.
            </ThemedText>
            <Button title="Back" variant="secondary" onPress={closeScreen} />
          </View>
        </Screen>
      );
    }
    return <ErrorState message={errorMessage(merchant.error)} onRetry={() => void merchant.refetch()} />;
  }

  const data = merchant.data;
  const shop = data.merchant;
  const favorite = toggle.isPending ? toggle.variables.favorite : data.favorite;
  const category = categoryOf(shop.category);

  const favoriteButton = (
    <HeaderIconButton
      icon="favorite"
      color={favorite ? 'danger' : 'text'}
      accessibilityLabel={favorite ? 'Remove from favorites' : 'Add to favorites'}
      onPress={() => {
        tapFeedback();
        toggle.mutate({ merchantId: shop.id, favorite: !favorite });
      }}
    />
  );

  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await merchant.refetch();
            setRefreshing(false);
          }}
          tintColor={theme.textSecondary}
        />
      }>
      <Stack.Screen options={{ title: shop.trade_name, ...(process.env.EXPO_OS === 'ios' ? { unstable_headerRightItems: () => [{ type: 'custom' as const, element: favoriteButton, hidesSharedBackground: true }] } : { headerRight: () => favoriteButton }) }} />
      <View style={styles.hero}>
        <MerchantLogo path={shop.logo_path} category={shop.category} size="large" />
        <View style={styles.flex}>
          <ThemedText type="title" accessibilityRole="header">
            {shop.trade_name}
          </ThemedText>
          <ThemedText type="secondary" themeColor="textSecondary">
            {[category.label, shop.city].filter(Boolean).join(' · ')}
          </ThemedText>
        </View>
      </View>
      {shop.description && (
        <ThemedText type="body" themeColor="textSecondary">
          {shop.description}
        </ThemedText>
      )}
      {toggle.isError && <Notice tone="danger" message={errorMessage(toggle.error)} />}

      <Card style={styles.points}>
        <View style={styles.pointsRow}>
          <View style={styles.flex}>
            <ThemedText type="overline" themeColor="textSecondary">
              YOUR POINTS HERE
            </ThemedText>
            <ThemedText type="stat" tabular>
              {formatPoints(data.balance)}
            </ThemedText>
          </View>
          <Icon name="loyalty" size={32} color="accentText" />
        </View>
        {data.program.active !== false && data.program.rule_type ? (
          <ThemedText type="secondary" themeColor="textSecondary">
            {`You earn ${ruleText({ type: data.program.rule_type, points_per_unit: data.program.points_per_unit, unit_centavos: data.program.unit_centavos, minimum_spend_centavos: data.program.minimum_spend_centavos })}. ${
              data.program.expiry_months ? `Points expire after ${data.program.expiry_months} months without a visit.` : 'Points don’t expire.'
            } Show your code at the counter to earn.`}
          </ThemedText>
        ) : (
          <ThemedText type="secondary" themeColor="textSecondary">
            This shop isn’t giving points right now.
          </ThemedText>
        )}
      </Card>

      <Section title="Rewards">
        {data.rewards.length === 0 ? (
          <ThemedText type="secondary" themeColor="textSecondary">
            No rewards listed yet.
          </ThemedText>
        ) : (
          <Card padded={false}>
            <View style={styles.clip}>
              {data.rewards.map((reward, index) => (
                <View key={reward.id}>
                  {index > 0 && <Divider inset />}
                  <RewardRow reward={{ ...reward, balance: data.balance }} merchantId={shop.id} />
                </View>
              ))}
            </View>
          </Card>
        )}
      </Section>

      {data.campaigns.length > 0 && (
        <Section title="Promotions">
          {data.campaigns.map((campaign) => (
            <Card key={campaign.id} style={styles.campaign}>
              <View style={styles.campaignHead}>
                <Icon name="local_offer" size={18} color="accentText" />
                <ThemedText type="heading" style={styles.flex}>
                  {campaign.name}
                </ThemedText>
              </View>
              {campaign.description && (
                <ThemedText type="secondary" themeColor="textSecondary">
                  {campaign.description}
                </ThemedText>
              )}
              {campaign.ends_at && (
                <ThemedText type="caption" themeColor="textSecondary">
                  {`Until ${formatDate(campaign.ends_at)}`}
                </ThemedText>
              )}
            </Card>
          ))}
        </Section>
      )}

      {data.branches.length > 0 && (
        <Section title={data.branches.length === 1 ? 'Location' : 'Branches'}>
          {data.branches.map((branch) => {
            const lines = hoursLines(branch.hours);
            const url = directionsUrl(branch, shop.trade_name);
            return (
              <Card key={branch.id} style={styles.branch}>
                <View style={styles.campaignHead}>
                  <ThemedText type="cardTitle" style={styles.flex}>
                    {branch.name}
                  </ThemedText>
                  {branch.distance_km !== null && (
                    <ThemedText type="caption" themeColor="textSecondary">
                      {formatDistance(branch.distance_km)}
                    </ThemedText>
                  )}
                </View>
                {(branch.address || branch.city) && (
                  <ThemedText type="secondary" themeColor="textSecondary" selectable>
                    {[branch.address, branch.city].filter(Boolean).join(', ')}
                  </ThemedText>
                )}
                {lines.length > 0 && (
                  <View style={styles.hours}>
                    <Icon name="schedule" size={16} color="textSecondary" />
                    <View style={styles.flex}>
                      {lines.map((line) => (
                        <ThemedText key={line} type="caption" themeColor="textSecondary">
                          {line}
                        </ThemedText>
                      ))}
                    </View>
                  </View>
                )}
                {url && <Button title="Directions" icon="directions" variant="secondary" size="small" onPress={() => openExternal(url)} style={styles.directions} />}
              </Card>
            );
          })}
        </Section>
      )}

      {(shop.contact_phone || shop.contact_email || shop.website) && (
        <Section title="Contact">
          <Card padded={false}>
            <View style={styles.clip}>
              {shop.contact_phone && <ListRow title="Call" subtitle={shop.contact_phone} icon="call" onPress={() => openExternal(`tel:${shop.contact_phone!.replace(/[^\d+]/g, '')}`)} />}
              {shop.contact_phone && (shop.contact_email || shop.website) && <Divider inset />}
              {shop.contact_email && <ListRow title="Email" subtitle={shop.contact_email} icon="mail" onPress={() => openExternal(`mailto:${shop.contact_email}`)} />}
              {shop.contact_email && shop.website && <Divider inset />}
              {shop.website && <ListRow title="Website" subtitle={shop.website.replace(/^https?:\/\//, '')} icon="language" onPress={() => openPage(/^https?:\/\//.test(shop.website!) ? shop.website! : `https://${shop.website}`)} />}
            </View>
          </Card>
        </Section>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  grow: {
    flexGrow: 1,
  },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  center: {
    textAlign: 'center',
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  flex: {
    flex: 1,
  },
  points: {
    gap: Spacing.two,
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clip: {
    borderRadius: Radius.card,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  campaign: {
    gap: Spacing.one,
  },
  campaignHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  branch: {
    gap: Spacing.two,
  },
  hours: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  directions: {
    alignSelf: 'flex-start',
  },
});
