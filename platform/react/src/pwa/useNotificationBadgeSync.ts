import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { NotificationStats } from '@openpeeps/common/types';
import {
  NOTIFICATION_STATS_QUERY_KEY,
  syncAppBadgeCount,
} from '../lib/notificationBadge';

const matchesQueryKey = (
  left: readonly unknown[],
  right: readonly unknown[],
): boolean => JSON.stringify(left) === JSON.stringify(right);

/** Keeps the OS app badge aligned with notification stats in React Query. */
export const useNotificationBadgeSync = (): void => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const syncFromCache = () => {
      const stats = queryClient.getQueryData<NotificationStats>(
        NOTIFICATION_STATS_QUERY_KEY,
      );
      if (stats?.unseen === undefined) return;
      void syncAppBadgeCount(stats.unseen);
    };

    syncFromCache();

    return queryClient.getQueryCache().subscribe((event) => {
      if (!matchesQueryKey(event.query.queryKey, NOTIFICATION_STATS_QUERY_KEY)) {
        return;
      }
      syncFromCache();
    });
  }, [queryClient]);
};
