import type { UseInfiniteQueryResult, InfiniteData } from '@tanstack/react-query';
import { useState, type ReactElement, type ReactNode } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { useScreenPadding } from '@/components/ui/screen';
import { ErrorState, LoadingState } from '@/components/ui/state-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { errorMessage } from '@/lib/errors';

import { Divider } from './ui/divider';

export type PagedListProps<T> = {
  query: UseInfiniteQueryResult<InfiniteData<T[]>>;
  keyOf: (item: T) => string;
  renderItem: (item: T) => ReactElement;
  /** Above the list (filters); stays while loading and on errors. */
  header?: ReactNode;
  /** What an empty list says, with its next step. */
  empty: ReactElement;
  /** Rows in one card with dividers (a history), or cards spaced apart. */
  grouped?: boolean;
  /** Divider inset for grouped rows with a leading icon. */
  insetDividers?: boolean;
  /** `tab`: a tab root (pads for the status bar and tab bar); `stack`: below a native header. */
  variant?: 'stack' | 'tab';
};

/**
 * A long server list on a stack screen: pages of 30 load as the customer scrolls, pull to refresh, and the four states. Grouped
 * rows sit in one card, like an iOS inset list.
 */
export function PagedList<T>({ query, keyOf, renderItem, header, empty, grouped = true, insetDividers = true, variant = 'stack' }: PagedListProps<T>) {
  const theme = useTheme();
  const padding = useScreenPadding(variant);
  const [refreshing, setRefreshing] = useState(false);
  const items = query.data?.pages.flat() ?? [];

  const refresh = async () => {
    setRefreshing(true);
    await query.refetch();
    setRefreshing(false);
  };

  const status = query.isPending ? <LoadingState /> : query.isError && !query.data ? <ErrorState message={errorMessage(query.error)} onRetry={() => void query.refetch()} /> : empty;

  return (
    <FlatList
      data={items}
      keyExtractor={keyOf}
      contentInsetAdjustmentBehavior={variant === 'stack' ? 'automatic' : 'never'}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[styles.content, padding]}
      ListHeaderComponent={header ? <View style={styles.header}>{header}</View> : undefined}
      ListEmptyComponent={<View style={styles.grow}>{status}</View>}
      renderItem={({ item, index }) => {
        if (!grouped) return <View style={index > 0 && styles.spaced}>{renderItem(item)}</View>;
        const first = index === 0;
        const last = index === items.length - 1;
        return (
          <View
            style={[
              styles.groupRow,
              { backgroundColor: theme.backgroundElement, borderColor: theme.border },
              first && styles.firstRow,
              last && styles.lastRow,
            ]}>
            {!first && <Divider inset={insetDividers} />}
            {renderItem(item)}
          </View>
        );
      }}
      onEndReachedThreshold={0.4}
      onEndReached={() => {
        if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
      }}
      ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator style={styles.more} /> : undefined}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={theme.textSecondary} />}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  header: {
    gap: Spacing.three,
    paddingBottom: Spacing.three,
  },
  grow: {
    flexGrow: 1,
  },
  spaced: {
    marginTop: Spacing.three,
  },
  groupRow: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  firstRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: Radius.card,
    borderTopRightRadius: Radius.card,
    borderCurve: 'continuous',
  },
  lastRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomLeftRadius: Radius.card,
    borderBottomRightRadius: Radius.card,
    borderCurve: 'continuous',
  },
  more: {
    paddingVertical: Spacing.four,
  },
});
