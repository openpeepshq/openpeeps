import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { applyNotificationStatsToCache } from '../lib/notificationBadge';
import {
  useServiceWorker,
  type UseServiceWorkerOptions,
} from './useServiceWorker';
import { useNavigate } from '../contexts/router';
import { normalizePushInvalidateMessage } from './pushInvalidate';
import { useNotificationBadgeSync } from './useNotificationBadgeSync';

export interface PwaProviderProps
  extends Omit<UseServiceWorkerOptions, 'onNavigate' | 'onInvalidateQueries'> {
  children?: ReactNode;
  /** Override how navigations triggered by SW NAVIGATE_TO are handled. */
  onNavigate?: (url: string) => void;
}

/**
 * High-level wrapper that registers the service worker and connects:
 *   - SW NAVIGATE_TO → router.navigate
 *   - SW INVALIDATE_QUERIES → react-query.invalidateQueries
 *
 * Mount this once near the top of your app (inside QueryClientProvider and
 * RouterProvider).
 */
export function PwaProvider({
  children,
  onNavigate,
  ...options
}: PwaProviderProps) {
  let navigate: ((url: string) => void) | undefined;
  try {
    navigate = useNavigate();
  } catch {
    navigate = undefined;
  }
  const queryClient = useQueryClient();
  useNotificationBadgeSync();

  const handleNavigate =
    onNavigate ??
    ((url: string) => {
      if (navigate) navigate(url);
      else if (typeof window !== 'undefined') window.location.assign(url);
    });

  useServiceWorker({
    ...options,
    onNavigate: handleNavigate,
    onInvalidateQueries: (message) => {
      const { keys, notificationStats } =
        normalizePushInvalidateMessage(message);
      if (notificationStats) {
        applyNotificationStatsToCache(queryClient, notificationStats);
      }
      if (keys.length === 0) {
        queryClient.invalidateQueries();
        return;
      }
      for (const key of keys) {
        queryClient.invalidateQueries({
          queryKey: key as readonly unknown[],
        });
      }
    },
  });

  return <>{children}</>;
}
