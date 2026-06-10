import { useEffect, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useServiceWorker,
  type UseServiceWorkerOptions,
} from './useServiceWorker';
import { useNavigate } from '../contexts/router';

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

  const handleNavigate =
    onNavigate ??
    ((url: string) => {
      if (navigate) navigate(url);
      else if (typeof window !== 'undefined') window.location.assign(url);
    });

  useServiceWorker({
    ...options,
    onNavigate: handleNavigate,
    onInvalidateQueries: (keys) => {
      const list = Array.isArray(keys) ? keys : [];
      if (list.length === 0) {
        queryClient.invalidateQueries();
        return;
      }
      for (const key of list) {
        queryClient.invalidateQueries({
          queryKey: Array.isArray(key) ? (key as readonly unknown[]) : [key],
        });
      }
    },
  });

  // Apply badge from notifications on first paint when supported
  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const setBadge = (navigator as any).setAppBadge;
    if (typeof setBadge === 'function') {
      setBadge.call(navigator, 0).catch(() => undefined);
    }
  }, []);

  return <>{children}</>;
}
