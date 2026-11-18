import { router } from 'expo-router';
import { useState } from 'react';

import { useActivity, type ActivityKind } from '@/api/customer';
import type { Activity } from '@/api/types';
import { PagedList } from '@/components/paged-list';
import { Ugi } from '@/components/ugi';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { SegmentedControl } from '@/components/ui/segmented-control';

import { ActivityRow } from '@/components/activity-row';

type Filter = 'all' | 'earned' | 'redeemed';
const KIND: Record<Filter, ActivityKind> = { all: null, earned: 'earned', redeemed: 'redeemed' };

/** Every transaction, newest first: all, earned (awards and positive adjustments) or redeemed. */
export function ActivityScreen() {
  const [filter, setFilter] = useState<Filter>('all');
  const query = useActivity(KIND[filter]);
  return (
    <PagedList<Activity>
      query={query}
      keyOf={(item) => item.id}
      renderItem={(item) => <ActivityRow item={item} />}
      header={
        <SegmentedControl
          accessibilityLabel="Show"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All' },
            { value: 'earned', label: 'Earned' },
            { value: 'redeemed', label: 'Redeemed' },
          ]}
        />
      }
      empty={
        <EmptyState
          illustration={<Ugi pose="thinking" size={110} />}
          title={filter === 'redeemed' ? 'No rewards redeemed yet' : 'No activity yet'}
          message={filter === 'redeemed' ? 'When a cashier scans one of your vouchers, it shows here.' : 'Points you earn at the counter show here, newest first.'}
          action={filter === 'redeemed' ? <Button title="Browse rewards" onPress={() => router.push('/rewards')} /> : <Button title="Show my code" onPress={() => router.navigate('/code')} />}
        />
      }
    />
  );
}
