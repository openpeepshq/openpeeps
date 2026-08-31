import type {
  InfiniteData,
  QueryClient,
  QueryKey,
} from '@tanstack/react-query';
import type {
  NotificationStats,
  PublicNotification,
} from '@openpeepshq/common/types';

export const NOTIFICATION_STATS_QUERY_KEY = [
  'profiles',
  'current',
  'notifications',
  'stats',
] as const;

/** Feed infinite-query keys end in `{ limit }`; stats/types use a string segment. */
export const isNotificationsFeedQueryKey = (queryKey: QueryKey): boolean =>
  queryKey[0] === 'profiles' &&
  queryKey[1] === 'current' &&
  queryKey[2] === 'notifications' &&
  typeof queryKey[3] === 'object' &&
  queryKey[3] !== null;

export const markNotificationPagesSeen = (
  current: InfiniteData<PublicNotification[]> | undefined,
): InfiniteData<PublicNotification[]> | undefined => {
  if (!current?.pages) return current;
  return {
    ...current,
    pages: current.pages.map((page) =>
      page.map((notification) =>
        notification.seen ? notification : { ...notification, seen: true },
      ),
    ),
  };
};

export const markCachedNotificationsSeen = (queryClient: QueryClient): void => {
  queryClient.setQueriesData<InfiniteData<PublicNotification[]>>(
    { predicate: (query) => isNotificationsFeedQueryKey(query.queryKey) },
    markNotificationPagesSeen,
  );
};

export const syncAppBadgeCount = async (unseen: number): Promise<void> => {
  if (typeof navigator === 'undefined') return;
  try {
    if (unseen <= 0 && navigator.clearAppBadge) {
      await navigator.clearAppBadge();
      return;
    }
    if (navigator.setAppBadge) {
      await navigator.setAppBadge(unseen);
    }
  } catch {
    // Badge API is best-effort.
  }
};

export const applyNotificationStatsToCache = (
  queryClient: QueryClient,
  stats: NotificationStats,
): void => {
  queryClient.setQueryData<NotificationStats>(
    NOTIFICATION_STATS_QUERY_KEY,
    stats,
  );
};
