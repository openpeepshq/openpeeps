import { useCallback, useEffect, useRef, useMemo } from 'react';
import type {
  NotificationStats,
  PublicNotification,
} from '@openpeepshq/common/types';

import { useT } from '../../i18n';
import { useOpenpeeps } from '../../contexts/openpeeps';
import {
  markCachedNotificationsSeen,
  syncAppBadgeCount,
} from '../../lib/notificationBadge';
import { NotificationItem } from './NotificationItem';
import { LoadingSpinner } from '@openpeepshq/react-ui';

export interface NotificationsListProps {
  pageSize?: number;
}

/**
 * Translation of `routes/(protected)/(private)/notifications/+page.svelte`.
 * Loads `useCurrentProfileNotifications` and renders one
 * `<NotificationItem>` per entry with IntersectionObserver-driven pagination.
 *
 * Also marks all notifications as seen on mount and clears the PWA app badge
 * — matching the Svelte version's `onMount`.
 */
export function NotificationsList({ pageSize = 15 }: NotificationsListProps) {
  const t = useT();
  const { openpeepsApi, queryClient, client } = useOpenpeeps();
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const query = openpeepsApi.useCurrentProfileNotifications({
    limit: pageSize,
  });

  const markAllNotificationsAsSeen =
    openpeepsApi.markAllNotificationsAsSeenAction()();
  const statsQueryKey = client.profiles.current.notificationStats.queryKey({});
  const markedSeenRef = useRef(false);

  const resetNotificationsView = useCallback(async () => {
    if (markedSeenRef.current) return;
    markedSeenRef.current = true;
    try {
      await markAllNotificationsAsSeen();
      markCachedNotificationsSeen(queryClient);
      queryClient.setQueryData<NotificationStats>(statsQueryKey, (current) => ({
        unread: current?.unread ?? 0,
        unseen: 0,
      }));
      await syncAppBadgeCount(0);
    } catch {
      markedSeenRef.current = false;
    }
  }, [markAllNotificationsAsSeen, queryClient, statsQueryKey]);

  useEffect(() => {
    void resetNotificationsView();
  }, [resetNotificationsView]);

  const refetch = query.refetch;
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refetch();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [refetch]);

  const notifications = useMemo(() => {
    const flat: PublicNotification[] = (query.data?.pages ?? []).flat();
    const seen = new Set<string>();
    const out: PublicNotification[] = [];
    for (const n of flat) {
      if (seen.has(n.id)) continue;
      seen.add(n.id);
      out.push(n);
    }
    return out;
  }, [query.data]);

  const hasItems = notifications.length > 0;
  const hasNextPage = query.hasNextPage;
  const isFetchingNextPage = query.isFetchingNextPage;
  const fetchNextPage = query.fetchNextPage;
  const loadMoreRef = useRef(() => {});
  loadMoreRef.current = () => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  };

  // Re-bind when the sentinel mounts or pagination ends — not on every page.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMoreRef.current();
        }
      },
      { rootMargin: '100px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, hasItems]);

  if (query.isLoading && notifications.length === 0) {
    return (
      <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
        <LoadingSpinner />
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <p className="text-muted-foreground px-5 py-8 text-sm">
        {t('notification.empty', { defaultValue: 'No notifications' })}
      </p>
    );
  }

  return (
    <div
      role="feed"
      aria-busy={query.isFetchingNextPage || undefined}
      className="relative"
    >
      {notifications.map((n) => (
        <NotificationItem key={n.id} notification={n} />
      ))}
      <div ref={sentinelRef} aria-hidden="true" className="h-8" />
      {query.hasNextPage ? (
        <div className="text-muted-foreground flex h-12 items-center justify-center text-sm">
          {query.isFetchingNextPage ? <LoadingSpinner /> : null}
        </div>
      ) : null}
    </div>
  );
}
