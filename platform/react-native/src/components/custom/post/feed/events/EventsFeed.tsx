import { ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import React from 'react';
import { EmptyStateContainer } from '../../../common/empty-state-container';
import { handleScroll } from '../../../../../lib/utils';
import { useFocusEffect } from '@react-navigation/native';
import type { PublicPost } from '@openpeeps/common';
import { CardEvent } from '../../types/event/CardEvent';
import { InfiniteQueryResult } from '../../../../../types';

interface Props {
  query: InfiniteQueryResult<PublicPost>;
  searchQuery?: string;
  type?: 'event' | 'jam';
}
export const EventsFeed = ({ query, searchQuery, type = 'event' }: Props) => {
  const [refreshing, setRefreshing] = React.useState(false);

  const results = React.useMemo(() => {
    if (!query.data?.pages) { return []; }
    return query.data.pages.flatMap(page => page);
  }, [query.data?.pages]);

  useFocusEffect(
    React.useCallback(() => {
      query.refetch();
    }, [query]),
  );

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await query.refetch();

    setRefreshing(false);
  }, [query]);

  const filteredResults = React.useMemo(() => {
    if (!searchQuery || !results.length) { return results; }

    const lower = searchQuery.toLowerCase();
    return results.filter(item => {
      const event = item.data as unknown as { name?: string; content?: string };
      return (
        (event?.name && event.name.toLowerCase().includes(lower)) ||
        (event?.content && event.content.toLowerCase().includes(lower))
      );
    });
  }, [results, searchQuery]);

  const content = (
    <>
      {query.isLoading && <ActivityIndicator size={'small'} />}
      {!query.isLoading && (
        <>
          {filteredResults && filteredResults?.length > 0 ? (
            <>
              {filteredResults.map((item, index) => (
                <CardEvent key={index} post={item} />
              ))}
              {query.isFetchingNextPage && <ActivityIndicator size={'small'} />}
            </>
          ) : (
            <EmptyStateContainer type={type === 'event' ? 'events' : 'my-jams'} />
          )}
        </>
      )}
    </>
  );

  return (
    <ScrollView
      className="bg-background  pb-20 mb-20 mt-4"
      contentContainerStyle={{ paddingBottom: 278 }}
      onScroll={({ nativeEvent }) => handleScroll(nativeEvent, query)}
      scrollEventThrottle={16}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      {content}
    </ScrollView>
  );
};
