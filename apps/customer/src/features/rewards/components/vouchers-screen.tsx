import { router } from 'expo-router';

import { useRedemptions } from '@/api/customer';
import type { Redemption, RedemptionStatus } from '@/api/types';
import { PagedList } from '@/components/paged-list';
import { Ugi } from '@/components/ugi';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ListRow } from '@/components/ui/list-row';
import type { ThemeColor } from '@/constants/theme';
import { formatWhen, pointsLabel } from '@/lib/format';

import { findVoucher } from '../voucher-store';

const STATUS: Record<RedemptionStatus, { label: string; color: ThemeColor; background: ThemeColor }> = {
  issued: { label: 'Ready', color: 'statusOk', background: 'statusOkSoft' },
  used: { label: 'Used', color: 'primary', background: 'primarySoft' },
  expired: { label: 'Expired', color: 'textSecondary', background: 'backgroundSelected' },
  cancelled: { label: 'Cancelled', color: 'textSecondary', background: 'backgroundSelected' },
};

/** Every voucher code the customer asked for, with what happened to it. A ready one made on this phone reopens its code. */
export function VouchersScreen() {
  const query = useRedemptions();
  const open = (item: Redemption) => {
    const voucher = item.status === 'issued' ? findVoucher(item.reward_id, item.expires_at) : undefined;
    if (voucher) router.push({ pathname: '/voucher', params: { key: voucher.key } });
    else router.push({ pathname: '/rewards/[id]', params: { id: item.reward_id, merchantId: item.merchant_id } });
  };
  return (
    <PagedList<Redemption>
      query={query}
      keyOf={(item) => item.id}
      renderItem={(item) => {
        const status = STATUS[item.status];
        const when = item.status === 'used' && item.used_at ? `Used ${formatWhen(item.used_at)}` : formatWhen(item.created_at);
        return (
          <ListRow
            title={item.reward}
            subtitle={`${item.merchant} · ${pointsLabel(item.points_cost)} · ${when}`}
            icon="confirmation_number"
            tone={item.status === 'issued' ? 'teal' : 'neutral'}
            onPress={() => open(item)}
            accessibilityLabel={`${item.reward}, ${item.merchant}, ${status.label}, ${when}`}
            trailing={<Badge label={status.label} color={status.color} background={status.background} />}
          />
        );
      }}
      empty={
        <EmptyState
          illustration={<Ugi pose="wink" size={110} />}
          title="No vouchers yet"
          message="When you redeem a reward, its code and what happened to it show here."
          action={<Button title="Browse rewards" onPress={() => router.push('/rewards')} />}
        />
      }
    />
  );
}
