import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { useWallet } from '@/api/customer';
import { ShortcutTile } from '@/components/shortcut-tile';
import { TabHeader } from '@/components/tab-header';
import { ThemedText } from '@/components/themed-text';
import { Ugi } from '@/components/ugi';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useScreenPadding } from '@/components/ui/screen';
import { SkeletonBlock } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/state-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { errorMessage } from '@/lib/errors';
import { formatPoints } from '@/lib/format';

import { ProgramCard } from './program-card';

/** Wallet: totals, shortcuts to history, vouchers and rewards, then one card per program the customer has points in. */
export function WalletScreen() {
  const theme = useTheme();
  const padding = useScreenPadding('tab');
  const wallet = useWallet();
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    await wallet.refetch();
    setRefreshing(false);
  };

  const accounts = wallet.data?.accounts ?? [];
  const shopTotal = accounts.filter((a) => a.scope === 'merchant').reduce((sum, a) => sum + a.balance, 0);
  const network = accounts.find((a) => a.scope === 'network');
  const shopCount = accounts.filter((a) => a.scope === 'merchant').length;

  const header = (
    <View style={styles.header}>
      <TabHeader title="Wallet" />
      {wallet.data && (
        <Card style={styles.summary}>
          <View style={styles.figure}>
            <ThemedText type="overline" themeColor="textSecondary">
              SHOP POINTS
            </ThemedText>
            <ThemedText type="stat" tabular>
              {formatPoints(shopTotal)}
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              {shopCount > 0 ? `Across ${shopCount} ${shopCount === 1 ? 'shop' : 'shops'}. Each shop’s points are spent at that shop.` : 'Each shop’s points are spent at that shop.'}
            </ThemedText>
          </View>
          {wallet.data.network_enabled && (
            <View style={[styles.network, { borderColor: theme.border }]}>
              <ThemedText type="overline" themeColor="textSecondary">
                NETWORK POINTS
              </ThemedText>
              <ThemedText type="statSmall" tabular themeColor="accentText">
                {formatPoints(network?.balance ?? 0)}
              </ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                {network && network.available < network.balance ? `${formatPoints(network.available)} available now; new network points are held for a few days.` : 'Spend them at any participating shop.'}
              </ThemedText>
            </View>
          )}
        </Card>
      )}
      <View style={styles.shortcuts}>
        <ShortcutTile icon="receipt_long" label="Activity" onPress={() => router.push('/activity')} />
        <ShortcutTile icon="confirmation_number" label="Vouchers" tone="teal" onPress={() => router.push('/vouchers')} />
        <ShortcutTile icon="redeem" label="Rewards" tone="amber" onPress={() => router.push('/rewards')} />
      </View>
      {accounts.length > 0 && (
        <ThemedText type="section" accessibilityRole="header">
          Your points by shop
        </ThemedText>
      )}
    </View>
  );

  const body = () => {
    if (wallet.isPending)
      return (
        <View style={styles.skeleton}>
          <SkeletonBlock height={150} radius={Radius.card} />
          <SkeletonBlock height={96} radius={Radius.card} />
          <SkeletonBlock height={96} radius={Radius.card} />
        </View>
      );
    if (wallet.isError) return <ErrorState message={errorMessage(wallet.error)} onRetry={() => void wallet.refetch()} />;
    return (
      <EmptyState
        illustration={<Ugi pose="thinking" size={130} />}
        title="No points yet"
        message="Show your code at any UGNAYA shop. The cashier scans it and your points appear here, shop by shop."
        action={<Button title="Show my code" icon="qr_code_2" onPress={() => router.navigate('/code')} />}
      />
    );
  };

  return (
    <FlatList
      data={wallet.data ? accounts : []}
      keyExtractor={(account) => account.account_id}
      renderItem={({ item }) => <ProgramCard account={item} />}
      ListHeaderComponent={header}
      ListEmptyComponent={body()}
      ItemSeparatorComponent={Separator}
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[styles.content, padding]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={theme.textSecondary} />}
    />
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  header: {
    gap: Spacing.four,
    paddingBottom: Spacing.three,
  },
  summary: {
    gap: Spacing.three,
  },
  figure: {
    gap: Spacing.half,
  },
  network: {
    gap: Spacing.half,
    paddingTop: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  shortcuts: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  skeleton: {
    gap: Spacing.three,
  },
  separator: {
    height: Spacing.three,
  },
});
