import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  FlatList,
  ActivityIndicator,
  Text,
  RefreshControl,
  ListRenderItem,
} from 'react-native';
import type { InfiniteData, UseInfiniteQueryResult } from '@tanstack/react-query';
import type { SuccessFailureResponse } from '@openpeepshq/common';

interface InfiniteScrollContainerProps<D> {
  query: UseInfiniteQueryResult<InfiniteData<D[], unknown>, SuccessFailureResponse>;
  renderItem: ListRenderItem<D>;
  uniqueBy: (item: D) => string;
  keyExtractor?: (item: D) => string;
  ListEmptyComponent?: React.ReactElement;
  contentPaddingBottom?: number;
}

export function InfiniteScrollContainer<D>({
  query,
  renderItem,
  uniqueBy,
  keyExtractor,
  ListEmptyComponent,
  contentPaddingBottom = 800,
}: InfiniteScrollContainerProps<D>) {
  const [refreshing, setRefreshing] = useState(false);

  const data = useMemo(() => {
    const pages = query.data?.pages ?? [];
    const flatData: D[] = pages.flat();
    const seen = new Set<string>();
    return flatData.filter(item => {
      const key = uniqueBy(item);
      if (seen.has(key)) { return false; }
      seen.add(key);
      return true;
    });
  }, [query.data, uniqueBy]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await query.refetch();
    setRefreshing(false);
  }, [query]);

  const onEndReached = () => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      query.fetchNextPage();
    }
  };

  if (query.isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor || uniqueBy}
      contentContainerStyle={{ paddingBottom: contentPaddingBottom }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      onEndReached={onEndReached}
      onEndReachedThreshold={0.6}
      ListEmptyComponent={
        ListEmptyComponent || (
          <View className="py-12 items-center justify-center">
            <Text className="text-neutral-500">No data found.</Text>
          </View>
        )
      }
      ListFooterComponent={
        query.isFetchingNextPage ? (
          <View className="py-4 items-center justify-center">
            <ActivityIndicator />
          </View>
        ) : null
      }
    />
  );
}
