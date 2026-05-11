import { useCallback, useEffect, useState } from 'react';
import type { OpenpeepsClient } from '@openpeeps/client';
import {
  checkPushSubscription,
  getPushSubscription,
  subscribePushNotifications,
  unsubscribePushNotifications,
} from './index';

export interface UsePushSubscriptionResult {
  /** True when the subscription is registered locally and on the server. */
  isSubscribed: boolean;
  /** Browser permission state for notifications. */
  permission: NotificationPermission | 'unsupported';
  /** Initial check is in progress. */
  isLoading: boolean;
  /** Subscribe + register with the OpenPeeps server. */
  subscribe: () => Promise<void>;
  /** Unsubscribe locally. */
  unsubscribe: () => Promise<void>;
}

export interface UsePushSubscriptionOptions {
  client: OpenpeepsClient;
  applicationServerKey?: string;
  /** When true (default) checks subscription state on mount. */
  autoCheck?: boolean;
}

export function usePushSubscription({
  client,
  applicationServerKey,
  autoCheck = true,
}: UsePushSubscriptionOptions): UsePushSubscriptionResult {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<
    NotificationPermission | 'unsupported'
  >(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'unsupported',
  );
  const [isLoading, setIsLoading] = useState(autoCheck);

  useEffect(() => {
    if (!autoCheck || !applicationServerKey) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    void checkPushSubscription({ client, applicationServerKey })
      .then((ok) => {
        if (!cancelled) setIsSubscribed(ok);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [client, applicationServerKey, autoCheck]);

  const subscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      await subscribePushNotifications({ client, applicationServerKey });
      const sub = await getPushSubscription();
      setIsSubscribed(!!sub);
      if (typeof Notification !== 'undefined')
        setPermission(Notification.permission);
    } finally {
      setIsLoading(false);
    }
  }, [client, applicationServerKey]);

  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      await unsubscribePushNotifications();
      setIsSubscribed(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isSubscribed, permission, isLoading, subscribe, unsubscribe };
}
