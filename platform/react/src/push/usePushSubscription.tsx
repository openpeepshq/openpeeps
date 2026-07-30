import { useCallback, useEffect, useState } from 'react';
import type { OpenpeepsClient } from '@openpeeps/client';
import {
  checkPushSubscription,
  getPushSubscription,
  subscribePushNotifications,
  unsubscribePushNotifications,
} from './index';

export type PushSubscriptionError =
  | 'unsupported'
  | 'no-service-worker'
  | 'permission-denied'
  | 'subscribe-failed';

export interface UsePushSubscriptionOptions {
  client: OpenpeepsClient;
  applicationServerKey?: string;
  /** When true (default) checks subscription state on mount. */
  autoCheck?: boolean;
}

const pushSupported =
  typeof window !== 'undefined' &&
  'Notification' in window &&
  'serviceWorker' in navigator &&
  'PushManager' in window;

export const usePushSubscription = ({
  client,
  applicationServerKey,
  autoCheck = true,
}: UsePushSubscriptionOptions) => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<
    NotificationPermission | 'unsupported'
  >(pushSupported ? Notification.permission : 'unsupported');
  const [hasServiceWorker, setHasServiceWorker] = useState(false);
  const [isLoading, setIsLoading] = useState(autoCheck);
  const [error, setError] = useState<PushSubscriptionError | null>(
    pushSupported ? null : 'unsupported',
  );

  useEffect(() => {
    if (!autoCheck || !pushSupported) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (cancelled) return;
        setHasServiceWorker(!!registration);
        if (!registration) {
          setError('no-service-worker');
          return;
        }
        if (!applicationServerKey) return;
        const ok = await checkPushSubscription({
          client,
          applicationServerKey,
        });
        if (!cancelled) setIsSubscribed(ok);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client, applicationServerKey, autoCheck]);

  const subscribe =
    useCallback(async (): Promise<PushSubscriptionError | null> => {
      if (!pushSupported) {
        setError('unsupported');
        return 'unsupported';
      }
      setIsLoading(true);
      setError(null);
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        setHasServiceWorker(!!registration);
        if (!registration) {
          setError('no-service-worker');
          return 'no-service-worker';
        }

        await subscribePushNotifications({ client, applicationServerKey });
        const sub = await getPushSubscription();
        setIsSubscribed(!!sub);
        setPermission(Notification.permission);
        if (sub) return null;

        const reason: PushSubscriptionError =
          Notification.permission !== 'granted'
            ? 'permission-denied'
            : 'subscribe-failed';
        setError(reason);
        return reason;
      } catch {
        setError('subscribe-failed');
        return 'subscribe-failed';
      } finally {
        setIsLoading(false);
      }
    }, [client, applicationServerKey]);

  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await unsubscribePushNotifications();
      setIsSubscribed(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isSubscribed,
    permission,
    isSupported: pushSupported,
    hasServiceWorker,
    isLoading,
    error,
    subscribe,
    unsubscribe,
  };
};
