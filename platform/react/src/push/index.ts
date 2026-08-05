/// <reference lib="dom" />
import type { OpenpeepsClient } from '@openpeeps/client';
import type { PushSubscriptionData } from '@openpeeps/common';
import { subscriptionKeyMatches, vapidKeyBytes } from './vapid';

const isPushSupported = () =>
  typeof window !== 'undefined' &&
  'Notification' in window &&
  'serviceWorker' in navigator &&
  'PushManager' in window;

/** Brave exposes `navigator.brave`; other Chromium browsers do not. */
export const isBraveBrowser = (): boolean =>
  typeof navigator !== 'undefined' && 'brave' in navigator;

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
): boolean =>
  subscriptionKeyMatches(
    subscription.options.applicationServerKey,
    applicationServerKey,
  );

const isApplicationServerKeyConflict = (err: unknown): boolean => {
  const message = err instanceof Error ? err.message : String(err);
  return /applicationServerKey|gcm_sender_id/i.test(message);
};

/**
 * Drop push subscriptions that don't match the current VAPID key across every
 * service-worker registration. Browsers keep at most one push subscription per
 * registration, but a page can have several registrations — clearing only the
 * current scope leaves subscribe() failing with applicationServerKey errors.
 */
const clearMismatchedPushSubscriptions = async (
  applicationServerKey: string,
): Promise<void> => {
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations.map(async (registration) => {
      const sub = await registration.pushManager.getSubscription();
      if (sub && !keyMatches(sub, applicationServerKey)) {
        await sub.unsubscribe();
      }
    }),
  );
};

const clearAllPushSubscriptions = async (): Promise<void> => {
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations.map(async (registration) => {
      const sub = await registration.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
    }),
  );
};

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

const subscribeOnRegistration = async (
  registration: ServiceWorkerRegistration,
  applicationServerKey: string,
): Promise<PushSubscription> => {
  const existing = await registration.pushManager.getSubscription();
  if (existing && keyMatches(existing, applicationServerKey)) {
    return existing;
  }
  if (existing) {
    await existing.unsubscribe();
  }
  return registration.pushManager.subscribe({
    applicationServerKey: vapidKeyBytes(applicationServerKey) as BufferSource,
    userVisibleOnly: true,
  });
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

  await clearMismatchedPushSubscriptions(applicationServerKey);

  let subscription: PushSubscription;
  try {
    subscription = await subscribeOnRegistration(
      registration,
      applicationServerKey,
    );
  } catch (err) {
    if (!isApplicationServerKeyConflict(err)) throw err;
    // Last resort: wipe every SW push subscription and retry once.
    await clearAllPushSubscriptions();
    subscription = await registration.pushManager.subscribe({
      applicationServerKey: vapidKeyBytes(applicationServerKey) as BufferSource,
      userVisibleOnly: true,
    });
  }

  await registerWithServer(client, subscription);
  return subscription;
};

export const unsubscribePushNotifications = async (): Promise<boolean> => {
  if (!isPushSupported()) return false;
  const registrations = await navigator.serviceWorker.getRegistrations();
  if (registrations.length === 0) return false;
  const results = await Promise.all(
    registrations.map(async (registration) => {
      const sub = await registration.pushManager.getSubscription();
      if (!sub) return false;
      return sub.unsubscribe();
    }),
  );
  return results.some(Boolean);
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
