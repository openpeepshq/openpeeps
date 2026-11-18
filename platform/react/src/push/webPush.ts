/// <reference lib="dom" />
import type { OpenpeepsClient } from '@openpeepshq/client';
import type { PushSubscriptionData } from '@openpeepshq/common';
import { handleResult, isSubscriptionNotFound } from './pushSubscriptionErrors';
import { subscriptionKeyMatches, vapidKeyBytes } from './vapid';

export { handleResult, isSubscriptionNotFound } from './pushSubscriptionErrors';

const isPushSupported = () =>
  typeof window !== 'undefined' &&
  'Notification' in window &&
  'serviceWorker' in navigator &&
  'PushManager' in window;

/** Brave exposes `navigator.brave`; other Chromium browsers do not. */
export const isBraveBrowser = (): boolean =>
  typeof navigator !== 'undefined' && 'brave' in navigator;

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

/**
 * Delete the server rows that match this browser's *live* push endpoints —
 * the endpoint of whatever each service-worker registration currently holds.
 * We deliberately match only live endpoints: a web row whose registration is
 * already gone (a profile or tab abandoned without an explicit logout, so
 * `getSubscription()` returns null and no endpoint is visible here) cannot be
 * matched client-side, and stays registered until the next push to that
 * endpoint is rejected with 404/410, which `doPush` then uses to remove the
 * dead row (same delivery-time safety net as dead FCM tokens).
 */
const deleteServerSubscription = async (
  client: OpenpeepsClient,
  endpoints: string[],
): Promise<void> => {
  if (endpoints.length === 0) return;
  const subscriptions = await client.accounts.current
    .listPushSubscriptions()
    .then(handleResult);
  const matches = subscriptions.filter(
    (s) => s.type === 'web' && endpoints.includes(s.endpoint),
  );
  await Promise.all(
    matches.map((match) =>
      client.accounts.current
        .deletePushSubcription({
          pathParameters: { pushSubscriptionId: match.id },
        })
        .then(handleResult)
        .catch((err) => {
          // The row may already be gone (concurrent logout); deleting a
          // missing subscription is not a failure.
          if (isSubscriptionNotFound(err)) return;
          throw err;
        }),
    ),
  );
};

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

/**
 * Unsubscribe this browser's push subscription. With a client it also removes
 * the matching server-side subscription rows (logout path); without one it
 * only drops the local registration (settings path, where the row is deleted
 * via the device list UI).
 */
export const unsubscribePushNotifications = async (options?: {
  client: OpenpeepsClient;
  /**
   * Set by the logout path on native: the RN side owns FCM cleanup
   * explicitly there, so the browser subscription flow must not run even
   * if its environment check ever changes.
   */
  skip?: boolean;
}): Promise<boolean> => {
  if (options?.skip || !isPushSupported()) return false;
  const registrations = await navigator.serviceWorker.getRegistrations();
  if (registrations.length === 0) return false;
  const endpoints = (
    await Promise.all(
      registrations.map(async (registration) => {
        const sub = await registration.pushManager.getSubscription();
        return sub ? [sub.endpoint] : [];
      }),
    )
  ).flat();
  if (options) {
    // One server list for all registrations, not one per endpoint.
    await deleteServerSubscription(options.client, endpoints);
  }
  const results = await Promise.all(
    registrations.map(async (registration) => {
      const sub = await registration.pushManager.getSubscription();
      return sub ? sub.unsubscribe() : false;
    }),
  );
  return results.some(Boolean);
};

/**
 * Explicit native gate for the logout cleanup path: on RN the logout flow owns
 * FCM cleanup itself (rn-components `unregisterPushForLogout`), so the browser
 * subscription flow must not run there — an explicit decision so the behavior
 * survives `isPushSupported` changing.
 */
export const isReactNative = (): boolean =>
  typeof navigator !== 'undefined' && navigator.product === 'ReactNative';

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
