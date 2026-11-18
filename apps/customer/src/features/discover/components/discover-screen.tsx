import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useMerchants, type MerchantSort } from '@/api/customer';
import type { MerchantCategory, MerchantSummary } from '@/api/types';
import { PagedList } from '@/components/paged-list';
import { TabHeader } from '@/components/tab-header';
import { ThemedText } from '@/components/themed-text';
import { Ugi } from '@/components/ugi';
import { Button } from '@/components/ui/button';
import { ChipSelect } from '@/components/ui/chip-select';
import { EmptyState } from '@/components/ui/empty-state';
import { GlassIconButton } from '@/components/ui/glass-icon-button';
import { Icon } from '@/components/ui/icon';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Fonts, InputHeight, Radius, Spacing, Typography } from '@/constants/theme';
import { useApproxLocation } from '@/hooks/use-approx-location';
import { useTheme } from '@/hooks/use-theme';
import { CATEGORIES, CATEGORY_ORDER } from '@/lib/categories';

import { MerchantRow } from '@/components/merchant-row';

const SEARCH_DELAY_MS = 300;
type CategoryFilter = 'all' | MerchantCategory;
const CATEGORY_OPTIONS = [{ value: 'all' as const, label: 'All' }, ...CATEGORY_ORDER.map((value) => ({ value, label: CATEGORIES[value].label, icon: CATEGORIES[value].icon }))];

/** Discover: search shops by name, town or description, filter by kind, sort by name, distance or favorites. */
export function DiscoverScreen() {
  const theme = useTheme();
  const location = useApproxLocation();
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [sort, setSort] = useState<MerchantSort>('name');

  useEffect(() => {
    const timer = setTimeout(() => setSearch(text), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [text]);

  const query = useMerchants({ search, category: category === 'all' ? null : category, sort, coords: location.coords });
  const wantsLocation = sort === 'nearby' && !location.coords;

  const header = (
    <View style={styles.header}>
      <TabHeader title="Discover" accessory={<GlassIconButton icon="qr_code_scanner" accessibilityLabel="Scan a shop’s code" onPress={() => router.push('/scanner')} />} />
      <View style={[styles.search, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <Icon name="search" size={20} color="textSecondary" />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Search shops or towns"
          placeholderTextColor={theme.textTertiary}
          accessibilityLabel="Search shops or towns"
          returnKeyType="search"
          autoCorrect={false}
          clearButtonMode="never"
          style={[styles.input, { color: theme.text }]}
        />
        {text.length > 0 && (
          <Pressable accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={10} onPress={() => setText('')}>
            <Icon name="cancel" size={20} color="textTertiary" filled />
          </Pressable>
        )}
      </View>
      <ChipSelect options={CATEGORY_OPTIONS} value={category} onChange={setCategory} inset={0} />
      <SegmentedControl
        accessibilityLabel="Sort by"
        value={sort}
        onChange={(next) => {
          setSort(next);
          if (next === 'nearby' && location.status !== 'granted') void location.ask();
        }}
        options={[
          { value: 'name', label: 'A–Z' },
          { value: 'nearby', label: 'Nearby' },
          { value: 'favorites', label: 'Favorites' },
        ]}
      />
      {wantsLocation && (
        <ThemedText type="caption" themeColor="textSecondary">
          {location.locating ? 'Finding where you are…' : 'Allow location to sort by distance. Until then, shops are listed A–Z.'}
        </ThemedText>
      )}
    </View>
  );

  const filtered = search.trim().length > 0 || category !== 'all';
  return (
    <PagedList<MerchantSummary>
      variant="tab"
      query={query}
      keyOf={(merchant) => merchant.id}
      renderItem={(merchant) => <MerchantRow merchant={merchant} />}
      header={header}
      empty={
        sort === 'favorites' && !filtered ? (
          <EmptyState
            illustration={<Ugi pose="wink" size={110} />}
            title="No favorites yet"
            message="Tap the heart on a shop’s page to keep it here."
            action={<Button title="Show all shops" variant="secondary" onPress={() => setSort('name')} />}
          />
        ) : filtered ? (
          <EmptyState
            icon="search_off"
            title="No shops match"
            message="Try another name or town, or a different kind of shop."
            action={
              <Button
                title="Clear filters"
                variant="secondary"
                onPress={() => {
                  setText('');
                  setCategory('all');
                }}
              />
            }
          />
        ) : (
          <EmptyState illustration={<Ugi pose="helpful" size={110} />} title="No shops yet" message="UGNAYA shops will show here as they join." />
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.three,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: InputHeight,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.input,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    ...Typography.body,
    fontFamily: Fonts.sans,
    includeFontPadding: false,
    paddingVertical: 0,
  },
});
