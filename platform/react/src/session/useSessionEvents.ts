import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { SessionEvent } from '@openpeepshq/common/types';
import type { OpenpeepsClient } from '@openpeepshq/client';
import { useCredentialsStore } from '../contexts/credentialsStore';
import { applyNotificationStatsToCache } from '../lib/notificationBadge';
import {
  dedupeQueryKeys,
  normalizePushInvalidateMessage,
} from '../pwa/pushInvalidate';

const BASE_KEYS = [
  ['profiles', 'current', 'notifications', 'stats'],
  ['profiles', 'current', 'notifications'],
] as const;

const applySessionEvent = (
  queryClient: ReturnType<typeof useQueryClient>,
  event: SessionEvent,
) => {
  if (event.type !== 'invalidate') return;
  const { keys, notificationStats } = normalizePushInvalidateMessage({
    keys: dedupeQueryKeys([
      ...BASE_KEYS,
      ...(event.notification?.invalidateQueries ?? []),
    ]),
    notificationStats: event.notificationStats,
  });
  if (notificationStats) {
    applyNotificationStatsToCache(queryClient, notificationStats);
  }
  if (keys.length === 0) {
    void queryClient.invalidateQueries();
    return;
  }
  for (const key of keys) {
    void queryClient.invalidateQueries({ queryKey: [...key] });
  }
};

/** One authenticated session SSE while a profile is loaded. */
export const useSessionEvents = (
  client: OpenpeepsClient,
  enabled: boolean,
): void => {
  const queryClient = useQueryClient();
  const { credentialsStore } = useCredentialsStore();
  const connectionIdRef = useRef(
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `conn-${Date.now()}`,
  );

  useEffect(() => {
    if (!enabled) return;

    const connectionId = connectionIdRef.current;
    let closed = false;
    let source:
      | Awaited<ReturnType<typeof client.profiles.current.sessionEvents.listen>>
      | undefined;

    void (async () => {
      const token = (await credentialsStore.get())?.token;
      if (closed || !token) return;
      source = await client.profiles.current.sessionEvents.listen({
        queryParameters: { platform: 'web', connectionId },
        headers: { Authorization: `Bearer ${token}` },
        handler: (event) => {
          if (!closed) applySessionEvent(queryClient, event);
        },
      });
      if (!closed) void source.stream();
    })();

    return () => {
      closed = true;
      void source?.close();
    };
  }, [client, credentialsStore, enabled, queryClient]);
};
