import { router, Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useMerchantActivity, useRewards, useWallet } from '@/api/customer';
import { MerchantLogo } from '@/components/merchant-logo';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Divider } from '@/components/ui/divider';
import { FactRow } from '@/components/ui/fact-row';
import { IconTile } from '@/components/ui/icon-tile';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { ErrorState, LoadingState, NotFoundState } from '@/components/ui/state-view';
import { Radius, Spacing } from '@/constants/theme';
import { RewardRow } from '@/components/reward-row';
import { errorMessage } from '@/lib/errors';
import { formatDate, formatPoints, pointsLabel, ruleText } from '@/lib/format';

import { ActivityRow } from '@/components/activity-row';
import { accountTitle } from './program-card';

/** A program's detail: balance, what's spendable now, how points are earned and when they expire, its rewards and history. */
export function AccountScreen() {
  const { accountId } = useLocalSearchParams<{ accountId: string }>();
  const wallet = useWallet();
  const account = wallet.data?.accounts.find((a) => a.account_id === accountId);
  const merchantId = account?.merchant_id ?? null;
  const history = useMerchantActivity(merchantId);
  const rewards = useRewards(false, merchantId);

  if (wallet.isPending) return <LoadingState />;
  if (wallet.isError) return <ErrorState message={errorMessage(wallet.error)} onRetry={() => void wallet.refetch()} />;
  if (!account) return <NotFoundState icon="account_balance_wallet" title="Not in your wallet" message="This program isn’t in your wallet any more." />;

  const network = account.scope === 'network';
  const held = account.balance - account.available;
  const shopRewards = rewards.data?.pages.flat() ?? [];

  return (
    <Screen>
      <Stack.Screen options={{ title: network ? 'Network points' : (account.merchant ?? '') }} />
      <Card style={styles.hero}>
        {network ? <IconTile icon="hub" tone="teal" size={56} /> : <MerchantLogo path={account.logo_path} category={account.category} size="large" />}
        <ThemedText type="heading" style={styles.center}>
          {accountTitle(account)}
        </ThemedText>
        <ThemedText type="hero" tabular>
          {formatPoints(account.balance)}
        </ThemedText>
        <ThemedText type="secondary" themeColor="textSecondary">
          {held > 0 ? `${formatPoints(account.available)} available now · ${formatPoints(held)} on hold` : 'points available'}
        </ThemedText>
        {!network && merchantId && <Button title="View shop" variant="secondary" size="small" icon="storefront" onPress={() => router.push({ pathname: '/merchant/[id]', params: { id: merchantId } })} />}
      </Card>

      <Section title="How it works">
        <Card padded={false}>
          <View style={styles.clip}>
            <FactRow label="You earn" value={ruleText(account.rule)} />
            <Divider />
            <FactRow label="Earned so far" value={pointsLabel(account.lifetime_earned)} />
            <Divider />
            <FactRow label="Last visit" value={formatDate(account.last_activity_at)} />
            <Divider />
            <FactRow label="Points expire" value={account.expires_at ? formatDate(account.expires_at) : 'No expiry'} />
          </View>
        </Card>
        <ThemedText type="caption" themeColor="textSecondary">
          {network
            ? 'Network points are earned at every participating shop and spent at any of them. New ones are held for a few days before you can use them.'
            : `${account.merchant ?? 'This shop'}’s points are spent at ${account.merchant ?? 'this shop'}. ${account.expires_at ? 'Each visit moves the expiry date forward.' : ''}`}
        </ThemedText>
      </Section>

      {!network && (
        <Section title="Rewards here">
          {rewards.isPending ? (
            <LoadingInline />
          ) : rewards.isError ? (
            <ThemedText type="secondary" themeColor="textSecondary">
              {errorMessage(rewards.error)}
            </ThemedText>
          ) : shopRewards.length === 0 ? (
            <ThemedText type="secondary" themeColor="textSecondary">
              No rewards listed yet. Keep collecting: the shop adds them in its dashboard.
            </ThemedText>
          ) : (
            <Card padded={false}>
              <View style={styles.clip}>
                {shopRewards.map((reward, index) => (
                  <View key={reward.id}>
                    {index > 0 && <Divider inset />}
                    <RewardRow reward={reward} />
                  </View>
                ))}
              </View>
            </Card>
          )}
        </Section>
      )}

      {!network && (
        <Section title="History here">
          {history.isPending ? (
            <LoadingInline />
          ) : history.isError ? (
            <ThemedText type="secondary" themeColor="textSecondary">
              {errorMessage(history.error)}
            </ThemedText>
          ) : (history.data ?? []).length === 0 ? (
            <ThemedText type="secondary" themeColor="textSecondary">
              No visits recorded yet.
            </ThemedText>
          ) : (
            <Card padded={false}>
              <View style={styles.clip}>
                {(history.data ?? []).slice(0, 20).map((item, index) => (
                  <View key={item.id}>
                    {index > 0 && <Divider inset />}
                    <ActivityRow item={item} />
                  </View>
                ))}
              </View>
            </Card>
          )}
        </Section>
      )}
    </Screen>
  );
}

function LoadingInline() {
  return (
    <ThemedText type="secondary" themeColor="textSecondary">
      Loading…
    </ThemedText>
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
  clip: {
    borderRadius: Radius.card,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
});
