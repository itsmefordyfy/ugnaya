import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import type { WalletAccount } from '@/api/types';
import { MerchantLogo } from '@/components/merchant-logo';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { IconTile } from '@/components/ui/icon-tile';
import { Spacing } from '@/constants/theme';
import { formatDate, formatPoints, pointsLabel, ruleText } from '@/lib/format';

export function accountTitle(account: WalletAccount): string {
  return account.scope === 'network' ? 'UGNAYA network points' : (account.merchant ?? account.program);
}

/** One program in the wallet: the shop, its balance (and what's spendable now), the earning rule and the expiry date. */
export function ProgramCard({ account }: { account: WalletAccount }) {
  const held = account.balance - account.available;
  const title = accountTitle(account);
  return (
    <Card
      onPress={() => router.push({ pathname: '/wallet/[accountId]', params: { accountId: account.account_id } })}
      accessibilityLabel={`${title}, ${pointsLabel(account.balance)}${held > 0 ? `, ${formatPoints(account.available)} available now` : ''}`}
      style={styles.card}>
      <View style={styles.head}>
        {account.scope === 'network' ? <IconTile icon="hub" tone="teal" /> : <MerchantLogo path={account.logo_path} category={account.category} />}
        <View style={styles.flex}>
          <ThemedText type="cardTitle" numberOfLines={1}>
            {title}
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
            {ruleText(account.rule)}
          </ThemedText>
        </View>
        <View style={styles.balance}>
          <ThemedText type="statSmall" tabular>
            {formatPoints(account.balance)}
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            points
          </ThemedText>
        </View>
      </View>
      {(held > 0 || account.expires_at || !account.merchant_active) && (
        <View style={styles.notes}>
          {held > 0 && <Note icon="schedule" text={`${formatPoints(account.available)} available now, ${formatPoints(held)} on hold`} />}
          {account.expires_at && <Note icon="event" text={`Expires ${formatDate(account.expires_at)} unless you visit`} />}
          {!account.merchant_active && <Note icon="info" text="This shop is paused on UGNAYA. Your points are kept." />}
        </View>
      )}
    </Card>
  );
}

function Note({ icon, text }: { icon: 'schedule' | 'event' | 'info'; text: string }) {
  return (
    <View style={styles.note}>
      <Icon name={icon} size={16} color="textSecondary" />
      <ThemedText type="caption" themeColor="textSecondary" style={styles.flex}>
        {text}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  flex: {
    flex: 1,
  },
  balance: {
    alignItems: 'flex-end',
  },
  notes: {
    gap: Spacing.one,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
