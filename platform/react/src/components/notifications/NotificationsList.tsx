import { useEffect, useRef, useMemo } from 'react';
import type { PublicNotification } from '@openpeeps/common/types';

import { useT } from '../../i18n';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { NotificationItem } from './NotificationItem';

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
  const { openpeepsApi } = useOpenpeeps();
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const query = openpeepsApi.useCurrentProfileNotifications({
    limit: pageSize,
  });

  const markSeen = openpeepsApi.markAllNotificationsAsSeenAction()();

  useEffect(() => {
    void markSeen();
    if (typeof navigator !== 'undefined' && navigator.clearAppBadge) {
      void navigator.clearAppBadge();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      if (
        entry.isIntersecting &&
        query.hasNextPage &&
        !query.isFetchingNextPage
      ) {
        void query.fetchNextPage();
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [query]);

  if (query.isLoading) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        {t('common.loading', { defaultValue: 'Loading…' })}
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <p className="px-5 py-8 text-sm text-muted-foreground">
        {t('notification.empty', { defaultValue: 'No notifications' })}
      </p>
    );
  }

  return (
    <div className="relative overflow-hidden">
      {notifications.map((n) => (
        <NotificationItem key={n.id} notification={n} />
      ))}
      <div ref={sentinelRef} aria-hidden="true" className="h-8" />
      {query.isFetchingNextPage && (
        <div className="flex justify-center py-4 text-sm text-muted-foreground">
          {t('common.loadingMore', { defaultValue: 'Loading more…' })}
        </div>
      )}
    </div>
  );
}
