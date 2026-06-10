/// <reference lib="dom" />
import { Base64 } from 'js-base64';
import type { OpenpeepsClient } from '@openpeeps/client';
import type { PushSubscriptionData } from '@openpeeps/common';

const isPushSupported = () =>
  typeof window !== 'undefined' &&
  'Notification' in window &&
  'serviceWorker' in navigator;

const handleResult = <T>(r: { data: T } | { error: unknown }): T => {
  if ('data' in r) return r.data;
  throw r.error;
};

export interface PushSubscriptionOptions {
  client: OpenpeepsClient;
  applicationServerKey?: string;
}

/**
 * Subscribe the current device to push notifications and register the
 * subscription with the OpenPeeps server.
 */
export const subscribePushNotifications = async ({
  client,
  applicationServerKey,
}: PushSubscriptionOptions): Promise<PushSubscription | undefined> => {
  if (!isPushSupported() || !applicationServerKey) return undefined;
  if (await checkPushSubscription({ client, applicationServerKey }))
    return undefined;
  if ((await Notification.requestPermission()) !== 'granted') return undefined;

  const sr = await navigator.serviceWorker.ready;
  const subscription = await sr.pushManager.subscribe({
    applicationServerKey: Base64.toUint8Array(applicationServerKey),
    userVisibleOnly: true,
  });

  await client.accounts.current
    .createPushSubscription({
      ...subscription.toJSON(),
      type: 'web',
    } as PushSubscriptionData)
    .then(handleResult);

  return subscription;
};

export const unsubscribePushNotifications = async (): Promise<boolean> => {
  if (!isPushSupported()) return false;
  const sr = await navigator.serviceWorker.ready;
  const sub = await sr.pushManager.getSubscription();
  if (!sub) return false;
  return sub.unsubscribe();
};

export const getPushSubscription =
  async (): Promise<PushSubscription | null> => {
    if (!isPushSupported()) return null;
    const sr = await navigator.serviceWorker.ready;
    return sr.pushManager.getSubscription();
  };

export const checkPushSubscription = async ({
  client,
  applicationServerKey,
}: PushSubscriptionOptions): Promise<boolean> => {
  if (!isPushSupported() || !applicationServerKey) return false;
  if (Notification.permission !== 'granted') return false;

  const sr = await navigator.serviceWorker.ready;
  const sub = await sr.pushManager.getSubscription();
  if (!sub) return false;

  const currentSubscriptions = await client.accounts.current
    .listPushSubscriptions()
    .then(handleResult);

  return (
    Base64.fromUint8Array(
      new Uint8Array(sub.options.applicationServerKey!),
      true,
    ) === applicationServerKey &&
    currentSubscriptions
      .filter((s) => s.type === 'web')
      .map((s) => s.endpoint)
      .includes(sub.endpoint)
  );
};

export { usePushSubscription } from './usePushSubscription';
