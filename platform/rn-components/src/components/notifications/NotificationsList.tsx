import { ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import React from 'react';
import type { PublicNotification } from '@openpeepshq/common';
import { useFocusEffect } from '@react-navigation/native';
import { useOpenpeeps } from '@openpeepshq/react';
import { handleScroll } from '../../lib/utils';
import { EmptyStateContainer } from '../custom/common/empty-state-container';
import { NotificationItem } from './NotificationItem';
import { InfiniteQueryResult } from '../../types';

export interface NotificationsListProps {
  /** Supply your own query to control fetching externally. When omitted, the
   * component fetches `useCurrentProfileNotifications` internally. */
  query?: InfiniteQueryResult<PublicNotification>;
  pageSize?: number;
  isNotificationFeed?: boolean;
  onRefresh?: () => Promise<unknown>;
}

export const NotificationsList = ({
  query: externalQuery,
  pageSize = 15,
  isNotificationFeed = true,
  onRefresh,
}: NotificationsListProps) => {
  const { openpeepsApi } = useOpenpeeps();
  const internalQuery = openpeepsApi.useCurrentProfileNotifications({
    limit: pageSize,
  });
  const query = externalQuery ?? internalQuery;

  const [refreshing, setRefreshing] = React.useState(false);
  const refetchRef = React.useRef(query.refetch);
  refetchRef.current = query.refetch;

  const allNotifications = React.useMemo(() => {
    if (!query.data?.pages) {
      return [];
    }
    return query.data.pages.flatMap((page) => page);
  }, [query.data?.pages]);

  useFocusEffect(
    React.useCallback(() => {
      refetchRef.current();
    }, [])
  );

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      if (onRefresh) {
        await onRefresh();
      } else {
        await refetchRef.current();
      }
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  const content = (
    <>
      {query.isLoading && <ActivityIndicator size={'small'} />}
      {!query.isLoading && (
        <>
          {allNotifications && allNotifications?.length > 0 ? (
            <>
              {allNotifications.map((notification, index) => (
                <NotificationItem key={index} notification={notification} />
              ))}
              {query.isFetchingNextPage && <ActivityIndicator size={'small'} />}
            </>
          ) : (
            <EmptyStateContainer
              type="notifications"
              copyKey="notification.empty"
              defaultValue="No notifications"
            />
          )}
        </>
      )}
    </>
  );

  if (!isNotificationFeed) {
    return content;
  }

  return (
    <ScrollView
      className="bg-background  pb-20 mb-20"
      contentContainerClassName="pb-[278px]"
      onScroll={({ nativeEvent }) => handleScroll(nativeEvent, query)}
      scrollEventThrottle={16}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {content}
    </ScrollView>
  );
};
