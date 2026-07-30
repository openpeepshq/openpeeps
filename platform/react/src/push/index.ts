/// <reference lib="dom" />
import { Base64 } from 'js-base64';
import type { OpenpeepsClient } from '@openpeeps/client';
import type { PushSubscriptionData } from '@openpeeps/common';

const isPushSupported = () =>
  typeof window !== 'undefined' &&
  'Notification' in window &&
  'serviceWorker' in navigator &&
  'PushManager' in window;

const handleResult = <T>(r: { data: T } | { error: unknown }): T => {
  if ('data' in r) return r.data;
  throw r.error;
};

/** `serviceWorker.ready` never settles when nothing is registered. */
const getRegistration = async (): Promise<
  ServiceWorkerRegistration | undefined
> => {
  if (!('serviceWorker' in navigator)) return undefined;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return undefined;
  return registration.active ? registration : navigator.serviceWorker.ready;
};

const keyMatches = (
  subscription: PushSubscription,
  applicationServerKey: string,
): boolean => {
  const key = subscription.options.applicationServerKey;
  if (!key) return false;
  return (
    Base64.fromUint8Array(new Uint8Array(key), true) === applicationServerKey
  );
};

/** Copy into a tight buffer — some browsers reject views into larger ArrayBuffers. */
const vapidKeyBytes = (applicationServerKey: string): Uint8Array =>
  new Uint8Array(Base64.toUint8Array(applicationServerKey));

const registerWithServer = async (
  client: OpenpeepsClient,
  subscription: PushSubscription,
): Promise<void> => {
  await client.accounts.current
    .createPushSubscription({
      ...subscription.toJSON(),
      type: 'web',
    } as PushSubscriptionData)
    .then(handleResult);
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
  if (await checkPushSubscription({ client, applicationServerKey })) {
    return (await getPushSubscription()) ?? undefined;
  }
  if ((await Notification.requestPermission()) !== 'granted') return undefined;

  const registration = await getRegistration();
  if (!registration) return undefined;

  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    if (keyMatches(existing, applicationServerKey)) {
      await registerWithServer(client, existing);
      return existing;
    }
    // Browsers reject subscribe() when a subscription exists for another key.
    await existing.unsubscribe();
  }

  const subscription = await registration.pushManager.subscribe({
    applicationServerKey: vapidKeyBytes(applicationServerKey),
    userVisibleOnly: true,
  });
  await registerWithServer(client, subscription);
  return subscription;
};

export const unsubscribePushNotifications = async (): Promise<boolean> => {
  if (!isPushSupported()) return false;
  const registration = await getRegistration();
  if (!registration) return false;
  const sub = await registration.pushManager.getSubscription();
  if (!sub) return false;
  return sub.unsubscribe();
};

export const getPushSubscription =
  async (): Promise<PushSubscription | null> => {
    if (!isPushSupported()) return null;
    const registration = await getRegistration();
    if (!registration) return null;
    return registration.pushManager.getSubscription();
  };

export const checkPushSubscription = async ({
  client,
  applicationServerKey,
}: PushSubscriptionOptions): Promise<boolean> => {
  if (!isPushSupported() || !applicationServerKey) return false;
  if (Notification.permission !== 'granted') return false;

  const registration = await getRegistration();
  if (!registration) return false;
  const sub = await registration.pushManager.getSubscription();
  if (!sub || !keyMatches(sub, applicationServerKey)) return false;

  const currentSubscriptions = await client.accounts.current
    .listPushSubscriptions()
    .then(handleResult);

  return currentSubscriptions
    .filter((s) => s.type === 'web')
    .map((s) => s.endpoint)
    .includes(sub.endpoint);
};

export {
  usePushSubscription,
  type PushSubscriptionError,
} from './usePushSubscription';
