import { router } from 'expo-router';
import { useState } from 'react';

import { useRewards } from '@/api/customer';
import type { Reward } from '@/api/types';
import { PagedList } from '@/components/paged-list';
import { Ugi } from '@/components/ugi';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { SegmentedControl } from '@/components/ui/segmented-control';

import { RewardRow } from '@/components/reward-row';

/** Every reward at every active shop, cheapest first, or only the ones the customer can redeem now. */
export function RewardsScreen() {
  const [filter, setFilter] = useState<'all' | 'ready'>('all');
  const query = useRewards(filter === 'ready');
  return (
    <PagedList<Reward>
      query={query}
      keyOf={(reward) => reward.id}
      renderItem={(reward) => <RewardRow reward={reward} />}
      header={
        <SegmentedControl
          accessibilityLabel="Show"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All rewards' },
            { value: 'ready', label: 'Ready to redeem' },
          ]}
        />
      }
      empty={
        <EmptyState
          illustration={<Ugi pose={filter === 'ready' ? 'thinking' : 'helpful'} size={110} />}
          title={filter === 'ready' ? 'Nothing to redeem yet' : 'No rewards yet'}
          message={filter === 'ready' ? 'Keep collecting: rewards you have enough points for show here.' : 'Shops add rewards as they join UGNAYA. Check back soon.'}
          action={filter === 'ready' ? <Button title="See all rewards" variant="secondary" onPress={() => setFilter('all')} /> : <Button title="Find a shop" onPress={() => router.navigate('/discover')} />}
        />
      }
    />
  );
}
