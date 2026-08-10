import type { QueryClient } from '@tanstack/react-query';
import type { NotificationStats } from '@openpeepshq/common/types';

export const NOTIFICATION_STATS_QUERY_KEY = [
  'profiles',
  'current',
  'notifications',
  'stats',
] as const;

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
