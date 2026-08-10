import { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { useOpenpeeps } from '@openpeepshq/react';
import type { NotificationStats } from '@openpeepshq/common';
import { setAppBadgeCount } from '~/lib/notification-helpers';
import {
  clearNotificationsScreenPushHandler,
  setNotificationsScreenPushHandler,
} from '~/lib/notifications-screen-state';

export const NOTIFICATION_STATS_QUERY_KEY = [
  'profiles',
  'current',
  'notifications',
  'stats',
] as const;

type UseNotificationBadgeResetOptions = {
  refetchFeed?: () => Promise<unknown>;
};

export const useNotificationBadgeReset = (
  options?: UseNotificationBadgeResetOptions,
) => {
  const { openpeepsApi, queryClient } = useOpenpeeps();
  const isFocused = useIsFocused();
  // The mutation factory calls `useContext` internally, so it must be invoked
  // during render to bind the QueryClient. Calling it inside the async callback
  // (the previous `markAllNotificationsAsSeen()()`) ran a hook outside render,
  // threw, and the PUT was never sent — so the server never marked them seen.
  const markAllNotificationsAsSeen =
    openpeepsApi.markAllNotificationsAsSeenAction()();
  const { data: stats, refetch: refetchStats } =
    openpeepsApi.useCurrentProfileNotificationStats();
  const markingRef = useRef(false);

  const resetBadge = useCallback(async () => {
    if (markingRef.current) {
      return;
    }
    markingRef.current = true;
    try {
      await markAllNotificationsAsSeen();
      queryClient.setQueryData<NotificationStats>(
        NOTIFICATION_STATS_QUERY_KEY,
        (current) => ({
          unread: current?.unread ?? 0,
          unseen: 0,
        }),
      );
      await setAppBadgeCount(0);
      await refetchStats();
      await options?.refetchFeed?.();
    } finally {
      markingRef.current = false;
    }
  }, [
    markAllNotificationsAsSeen,
    queryClient,
    refetchStats,
    options?.refetchFeed,
  ]);

  const handlePushWhileFocused = useCallback(
    async (unseen: number) => {
      queryClient.setQueryData<NotificationStats>(
        NOTIFICATION_STATS_QUERY_KEY,
        (current) => ({
          unread: current?.unread ?? 0,
          unseen,
        }),
      );
      await setAppBadgeCount(unseen);
      await resetBadge();
    },
    [queryClient, resetBadge],
  );

  useFocusEffect(
    useCallback(() => {
      setNotificationsScreenPushHandler(handlePushWhileFocused);
      void resetBadge();
      return () => {
        clearNotificationsScreenPushHandler();
      };
    }, [resetBadge, handlePushWhileFocused]),
  );

  useEffect(() => {
    if (isFocused && stats && stats.unseen > 0) {
      void resetBadge();
    }
  }, [isFocused, stats?.unseen, resetBadge]);

  return { resetBadge, handlePushWhileFocused };
};
