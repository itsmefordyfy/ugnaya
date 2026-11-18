import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { useHome } from '@/api/customer';
import { PromptCard } from '@/components/prompt-card';
import { TabHeader } from '@/components/tab-header';
import { ThemedText } from '@/components/themed-text';
import { Ugi } from '@/components/ugi';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Divider } from '@/components/ui/divider';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { SkeletonBlock } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/state-view';
import { Radius, Spacing } from '@/constants/theme';
import { useMe } from '@/api/session';
import { MerchantRow } from '@/components/merchant-row';
import { useApproxLocation } from '@/hooks/use-approx-location';
import { BellButton, usePushPrompt } from '@/features/notifications';
import { RewardCard } from '@/features/rewards';
import { ActivityRow } from '@/components/activity-row';
import { MemberCard } from '@/components/member-card';
import { useTheme } from '@/hooks/use-theme';
import { errorMessage } from '@/lib/errors';
import { formatDate, greeting } from '@/lib/format';

/**
 * Home: a greeting and the bell, the member card (tap: the code), the asks for notifications and location (each explained,
 * each dismissible), rewards, shops near you, promotions, news from UGNAYA and the latest activity. One call (customer_home).
 */
export function HomeScreen() {
  const me = useMe();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const location = useApproxLocation();
  const home = useHome(location.coords);
  const push = usePushPrompt();
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([home.refetch(), queryClient.invalidateQueries({ queryKey: ['unread', me] })]);
    setRefreshing(false);
  };

  const name = home.data?.profile?.display_name?.split(' ')[0];
  const header = <TabHeader title={name ? `${greeting()}, ${name}` : greeting()} accessory={<BellButton />} />;

  if (home.isPending) {
    return (
      <Screen variant="tab" scrollEnabled={false}>
        {header}
        <SkeletonBlock height={190} radius={Radius.card + 4} />
        <SkeletonBlock height={24} width="40%" />
        <View style={styles.skeletonRow}>
          <SkeletonBlock height={190} width={220} radius={Radius.card} />
          <SkeletonBlock height={190} width={220} radius={Radius.card} />
        </View>
        <SkeletonBlock height={160} radius={Radius.card} />
      </Screen>
    );
  }

  if (home.isError && !home.data) {
    return (
      <Screen variant="tab" contentStyle={styles.grow}>
        {header}
        <ErrorState message={errorMessage(home.error)} onRetry={() => void home.refetch()} />
      </Screen>
    );
  }

  const data = home.data;
  const newMember = data.recent_activity.length === 0 && data.points.merchant === 0;

  return (
    <Screen variant="tab" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={theme.textSecondary} />}>
      {header}
      <MemberCard
        name={data.profile?.display_name ?? null}
        memberId={data.profile?.member_id ?? null}
        merchantPoints={data.points.merchant}
        networkPoints={data.points.network}
        showNetwork={data.points.network > 0}
        onPress={() => router.navigate('/code')}
      />

      {push.visible && (
        <PromptCard
          icon="notifications_active"
          tone="teal"
          title="Know when points arrive"
          message="Get a notification when you earn points, a reward is ready, or points are about to expire."
          actionLabel="Turn on"
          onAction={() => void push.allow()}
          onDismiss={() => void push.dismiss()}
        />
      )}

      {newMember && (
        <Card style={styles.welcome}>
          <Ugi pose="happy" size={96} />
          <View style={styles.welcomeText}>
            <ThemedText type="heading">Your first points are one visit away</ThemedText>
            <ThemedText type="secondary" themeColor="textSecondary">
              At any UGNAYA shop, show your code at the counter. The cashier scans it and your points land here.
            </ThemedText>
            <Button title="Find a shop" size="small" variant="secondary" icon="storefront" onPress={() => router.navigate('/discover')} style={styles.start} />
          </View>
        </Card>
      )}

      {data.featured_rewards.length > 0 && (
        <Section title="Rewards for you" actionLabel="See all" onAction={() => router.push('/rewards')}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel} style={styles.bleed}>
            {data.featured_rewards.map((reward) => (
              <RewardCard key={reward.id} reward={reward} />
            ))}
          </ScrollView>
        </Section>
      )}

      <Section title={location.coords ? 'Near you' : 'Shops on UGNAYA'} actionLabel="See all" onAction={() => router.navigate('/discover')}>
        {location.status === 'undetermined' && (
          <PromptCard
            icon="near_me"
            title="See shops near you"
            message="Allow location while you use UGNAYA to sort shops by distance. It isn’t stored, and the app works without it."
            actionLabel="Allow location"
            onAction={() => void location.ask()}
          />
        )}
        {data.nearby.length > 0 ? (
          <Card padded={false}>
            <View style={styles.clip}>
              {data.nearby.map((merchant, index) => (
                <View key={merchant.id}>
                  {index > 0 && <Divider inset />}
                  <MerchantRow merchant={merchant} />
                </View>
              ))}
            </View>
          </Card>
        ) : (
          <Card>
            <ThemedText type="secondary" themeColor="textSecondary">
              No shops are on UGNAYA here yet. New ones join every week.
            </ThemedText>
          </Card>
        )}
      </Section>

      {data.promotions.length > 0 && (
        <Section title="Promotions">
          {data.promotions.map((promo) => (
            <Card key={promo.id} onPress={() => router.push({ pathname: '/merchant/[id]', params: { id: promo.merchant_id } })} style={styles.promo}>
              <View style={styles.promoHead}>
                <Icon name="local_offer" size={18} color="accentText" />
                <ThemedText type="caption" themeColor="accentText" style={styles.flex}>
                  {promo.merchant}
                </ThemedText>
                {promo.ends_at && (
                  <ThemedText type="caption" themeColor="textSecondary">
                    {`Until ${formatDate(promo.ends_at)}`}
                  </ThemedText>
                )}
              </View>
              <ThemedText type="heading">{promo.name}</ThemedText>
              {promo.description && (
                <ThemedText type="secondary" themeColor="textSecondary">
                  {promo.description}
                </ThemedText>
              )}
            </Card>
          ))}
        </Section>
      )}

      {data.announcements.map((note) => (
        <Card key={note.id} tone="primarySoft" style={styles.promo}>
          <View style={styles.promoHead}>
            <Icon name="campaign" size={18} color="primary" />
            <ThemedText type="caption" themeColor="primary">
              From UGNAYA
            </ThemedText>
          </View>
          <ThemedText type="heading">{note.title}</ThemedText>
          <ThemedText type="secondary" themeColor="textSecondary">
            {note.body}
          </ThemedText>
        </Card>
      ))}

      {data.recent_activity.length > 0 && (
        <Section title="Recent activity" actionLabel="See all" onAction={() => router.push('/activity')}>
          <Card padded={false}>
            <View style={styles.clip}>
              {data.recent_activity.map((item, index) => (
                <View key={item.id}>
                  {index > 0 && <Divider inset />}
                  <ActivityRow item={item} />
                </View>
              ))}
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
  skeletonRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  welcome: {
    flexDirection: 'row',
    gap: Spacing.three,
    alignItems: 'center',
  },
  welcomeText: {
    flex: 1,
    gap: Spacing.one,
  },
  start: {
    alignSelf: 'flex-start',
    marginTop: Spacing.two,
  },
  // The row of rewards runs to the screen's edges, with the first card lined up with the content.
  bleed: {
    marginHorizontal: -Spacing.three,
  },
  carousel: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  clip: {
    borderRadius: Radius.card,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  promo: {
    gap: Spacing.one,
  },
  promoHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  flex: {
    flex: 1,
  },
});
