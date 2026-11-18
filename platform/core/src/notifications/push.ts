import {
  Account,
  PushPayload,
  NotificationStats,
  ProfileWithMeta,
  PushNotification,
  PushSubscription,
} from '@openpeepshq/common/types';
import {
  getUniqueBy,
  pushSubscriptionDeliveryKey,
} from '@openpeepshq/common/lib';
import { communityConfig, config } from '../config';
import webPush from 'web-push';
import { logger } from '../log';
import { type JobLog, logFailure, logStep } from '../jobs';
import {
  deletePushSubscription,
  listPushSubscriptionsByAccount,
} from '../pushSubscriptions';
import { getNotificationStats } from './finders';
import { ApnsClient, Notification as IOSPushNotification } from 'apns2';
import { getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { jwtUtil } from '../jwt';
import { uuidv7 } from 'uuidv7';

const log = logger('core:notifications:push');

// Tokens/endpoints are long and sensitive; show just enough to correlate logs
// without dumping the full credential.
const shorten = (value: string) =>
  value.length > 14 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value;

/** Stable, log-friendly identifier for a subscription (id + type + device hint). */
const describeSubscription = (subscription: PushSubscription): string => {
  switch (subscription.type) {
    case 'web': {
      let host = 'unknown';
      try {
        host = new URL(subscription.endpoint).host;
      } catch {
        // keep 'unknown'
      }
      return `web sub=${subscription.id} endpoint=${host}`;
    }
    case 'webhook':
      // Intentionally prints the full URL: the webhook endpoint is the
      // subscriber's own configured destination (their choice to expose), and
      // shortening it would make delivery-failure logs impossible to
      // correlate. The apn/fcm tokens below stay shortened because they are
      // device credentials, not user-configured endpoints.
      return `webhook sub=${subscription.id} url=${subscription.url}`;
    case 'apn':
      return `apn sub=${subscription.id} token=${shorten(subscription.apnToken)}`;
    case 'fcm':
      return `fcm sub=${subscription.id} token=${shorten(subscription.fcmToken)}`;
  }
};

export const getIOSPushClient = async () => {
  const { apps } = await config();
  return {
    Notification: IOSPushNotification,
    iosClient: new ApnsClient({
      team: apps.ios.teamId || '',
      keyId: apps.ios.apnKeyId || '',
      signingKey: apps.ios.apnSigningKey || '',
      keepAlive: true,
    }),
  };
};

const sendWebPushNotification = (
  subscription: PushSubscription,
  payload: PushPayload,
) =>
  config().then(async (config) =>
    webPush.sendNotification(
      subscription as webPush.PushSubscription,
      JSON.stringify(payload),
      {
        vapidDetails: {
          privateKey: config.vapid.privateKey || '',
          publicKey: config.vapid.publicKey || '',
          subject: `mailto:${(await communityConfig()).info.contactEmail}`,
        },
        contentEncoding: 'aes128gcm',
      },
    ),
  );

/**
 * Carries the webhook target's HTTP status so callers can tell a gone/dead
 * endpoint (404/410) apart from a transient failure (timeout, 5xx, …) —
 * the web path rejects with `{ statusCode }` for the same reason, and only a
 * gone endpoint justifies deleting the subscription.
 */
class WebhookPushError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number) {
    super(`Webhook push failed with status ${statusCode}`);
    this.name = 'WebhookPushError';
    this.statusCode = statusCode;
  }
}

const sendWebhookPushNotification = async (
  subscription: Extract<PushSubscription, { type: 'webhook' }>,
  payload: PushPayload,
) => {
  const jwt = await jwtUtil();
  const token = await jwt.sign({
    payload: {
      type: 'pushNotification',
      payload,
    },
    expirationTime: '5m',
    id: uuidv7(),
  });

  const response = await fetch(subscription.url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      token,
    }),
  });

  if (!response.ok) {
    throw new WebhookPushError(response.status);
  }
};

const sendAppIOSPushNotifications = async (
  subscriptions: Extract<PushSubscription, { type: 'apn' }>[],
  payload: PushPayload,
  notification: PushNotification | undefined,
  jobLog?: JobLog,
) => {
  if (subscriptions.length === 0) return;

  const serializedPayload = JSON.stringify(payload);

  const { iosClient, Notification } = await getIOSPushClient();

  const notifications = subscriptions.map(
    ({ apnToken }) =>
      new Notification(apnToken, {
        badge: Number(notification?.options?.badge || '1'),
        alert: notification?.title,
        data: { payload: serializedPayload },
      }),
  );

  await logStep(
    jobLog,
    log,
    `Sending APNs push to ${subscriptions.length} device(s)`,
  );

  let results: Awaited<ReturnType<typeof iosClient.sendMany>>;
  try {
    results = await iosClient.sendMany(notifications);
  } catch (error) {
    await logFailure(
      jobLog,
      log,
      `APNs sendMany threw for ${subscriptions.length} device(s)`,
      error,
    );
    return;
  }

  let delivered = 0;
  let failed = 0;
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const subscription = subscriptions[i];
    if (result && typeof result === 'object' && 'error' in result) {
      failed++;
      await logFailure(
        jobLog,
        log,
        `APNs push to ${describeSubscription(subscription)} failed`,
        result.error,
      );
    } else {
      delivered++;
      await logStep(
        jobLog,
        log,
        `APNs push delivered to ${describeSubscription(subscription)}`,
      );
    }
  }

  await logStep(
    jobLog,
    log,
    `APNs push complete: ${delivered} delivered, ${failed} failed`,
  );
};

const describeFcmTarget = (
  account: Account,
  subscription: Extract<PushSubscription, { type: 'fcm' }>,
) =>
  `account ${account.id} (${account.email}); ${describeSubscription(subscription)}`;

const sendAppFCMPushNotifications = async (
  subscriptions: Extract<PushSubscription, { type: 'fcm' }>[],
  payload: PushPayload,
  notification: PushNotification,
  account: Account,
  jobLog?: JobLog,
) => {
  if (subscriptions.length === 0) return;

  const serializedPayload = JSON.stringify(payload);
  const tokens = subscriptions.map((sub) => sub.fcmToken);
  if (getApps().length === 0) {
    for (const subscription of subscriptions) {
      await logFailure(
        jobLog,
        log,
        `FCM not initialized; skipping push to ${describeFcmTarget(account, subscription)}`,
      );
    }
    return;
  }

  for (const subscription of subscriptions) {
    await logStep(
      jobLog,
      log,
      `Attempting FCM push to ${describeFcmTarget(account, subscription)}`,
    );
  }

  let result: Awaited<
    ReturnType<ReturnType<typeof getMessaging>['sendEachForMulticast']>
  >;
  try {
    result = await getMessaging().sendEachForMulticast({
      tokens,
      data: { payload: serializedPayload },
      apns: {
        payload: {
          aps: {
            contentAvailable: true,
            priority: 'high',
            alert: notification.title,
            badge: Number(notification?.options?.badge || '1'),
            data: notification?.options?.data,
          },
        },
      },
    });
  } catch (error) {
    for (const subscription of subscriptions) {
      await logFailure(
        jobLog,
        log,
        `FCM push to ${describeFcmTarget(account, subscription)} failed`,
        error,
      );
    }
    return;
  }

  // v14 surfaces per-token failures as `response.error` objects (firebase#3140).
  // No extra v14-specific error mapping is intentionally added here:
  // `formatErrorDetail` (jobLog) already extracts `code`/`statusCode`/`reason`
  // from whatever error shape arrives, so v14's error codes reach the job log
  // pre-formatted.
  for (let i = 0; i < result.responses.length; i++) {
    const response = result.responses[i];
    const subscription = subscriptions[i];
    if (!subscription) continue;
    if (response.success) {
      await logStep(
        jobLog,
        log,
        `FCM push delivered to ${describeFcmTarget(account, subscription)}`,
      );
    } else {
      await logFailure(
        jobLog,
        log,
        `FCM push to ${describeFcmTarget(account, subscription)} failed`,
        response.error,
      );
      // registration-token-not-registered is the only reliable dead-token
      // signal: INVALID_ARGUMENT also fires for request-level problems (bad
      // payload keys, size limits), where the token is still live. FCM v1
      // codes are normalized to UPPERCASE client codes, so match the suffix
      // case-insensitively.
      const errorCode = (response.error as { code?: string } | undefined)?.code;
      if (
        typeof errorCode === 'string' &&
        /registration-token-not-registered/i.test(errorCode)
      ) {
        await deletePushSubscription(subscription.id)
          .then(() =>
            logStep(
              jobLog,
              log,
              `Removed dead FCM subscription ${subscription.id} (${errorCode})`,
            ),
          )
          .catch((deleteError) =>
            logFailure(
              jobLog,
              log,
              `failed to remove FCM subscription ${subscription.id}`,
              deleteError,
            ),
          );
      }
    }
  }

  await logStep(
    jobLog,
    log,
    `FCM push complete: ${result.successCount} delivered, ${result.failureCount} failed`,
  );
};
export const doPush = async (
  notification: PushNotification | undefined,
  notificationStats: NotificationStats,
  account: Account,
  jobLog?: JobLog,
) => {
  if (!notification) {
    await logStep(
      jobLog,
      log,
      `No push payload for account ${account.id} (${account.email}); nothing to send`,
    );
    return;
  }

  const payloadData = {
    notification,
    notificationStats,
  };

  const subscriptions = await listPushSubscriptionsByAccount(account);
  const uniqueSubscriptions = getUniqueBy(
    subscriptions,
    pushSubscriptionDeliveryKey,
  );
  const duplicateSubscriptions = subscriptions.filter(
    (subscription) =>
      !uniqueSubscriptions.some((unique) => unique.id === subscription.id),
  );

  if (duplicateSubscriptions.length > 0) {
    await logStep(
      jobLog,
      log,
      `Removing ${duplicateSubscriptions.length} duplicate push subscription(s) for account ${account.id}`,
    );
    await Promise.all(
      duplicateSubscriptions.map((subscription) =>
        deletePushSubscription(subscription.id).catch((error) =>
          logFailure(
            jobLog,
            log,
            `failed to remove duplicate subscription ${subscription.id}`,
            error,
          ),
        ),
      ),
    );
  }

  const webSubscriptions = uniqueSubscriptions.filter(
    (sub): sub is Extract<PushSubscription, { type: 'web' }> =>
      sub.type === 'web',
  );
  const webhookSubscriptions = uniqueSubscriptions.filter(
    (sub): sub is Extract<PushSubscription, { type: 'webhook' }> =>
      sub.type === 'webhook',
  );
  const apnSubscriptions = uniqueSubscriptions.filter(
    (sub) => sub.type === 'apn',
  );
  const fcmSubscriptions = uniqueSubscriptions.filter(
    (sub) => sub.type === 'fcm',
  );

  await logStep(
    jobLog,
    log,
    `Delivering push "${notification.title}" to account ${account.id} (${account.email}); ` +
      `subscriptions: web=${webSubscriptions.length} webhook=${webhookSubscriptions.length} ` +
      `apn=${apnSubscriptions.length} fcm=${fcmSubscriptions.length}`,
  );

  if (subscriptions.length === 0) {
    await logStep(
      jobLog,
      log,
      `No push subscriptions for account ${account.id} (${account.email}); skipping`,
    );
    return;
  }

  for (const subscription of webSubscriptions) {
    await logStep(
      jobLog,
      log,
      `Sending web push to ${describeSubscription(subscription)}`,
    );
    await sendWebPushNotification(subscription, payloadData)
      .then(async (result) => {
        if (result && result.statusCode >= 400) {
          await logFailure(
            jobLog,
            log,
            `web push to ${describeSubscription(subscription)} returned status ${result.statusCode}`,
          );
          return;
        }
        await logStep(
          jobLog,
          log,
          `Web push delivered to ${describeSubscription(subscription)} (status ${result?.statusCode ?? 'n/a'})`,
        );
      })
      .catch(async (error) => {
        // web-push rejects with { statusCode } for >= 400 and resolves for
        // 2xx/3xx. Only 404/410 mean the endpoint is gone; deleting on
        // anything else (403 VAPID misconfig, 429 rate limit, transient
        // network errors with no status) would wipe live subscriptions.
        const statusCode = (error as { statusCode?: number } | undefined)
          ?.statusCode;
        if (statusCode !== 404 && statusCode !== 410) {
          await logFailure(
            jobLog,
            log,
            `web push to ${describeSubscription(subscription)} failed; keeping subscription`,
            error,
          );
          return;
        }
        await logFailure(
          jobLog,
          log,
          `web push to ${describeSubscription(subscription)} gone (${statusCode}); removing dead subscription`,
          error,
        );
        await deletePushSubscription(subscription.id)
          .then(() =>
            logStep(
              jobLog,
              log,
              `Removed dead web subscription ${subscription.id}`,
            ),
          )
          .catch((deleteError) =>
            logFailure(
              jobLog,
              log,
              `failed to remove web subscription ${subscription.id}`,
              deleteError,
            ),
          );
      });
  }

  for (const subscription of webhookSubscriptions) {
    await logStep(
      jobLog,
      log,
      `Sending webhook push to ${describeSubscription(subscription)}`,
    );
    await sendWebhookPushNotification(subscription, payloadData)
      .then(() =>
        logStep(
          jobLog,
          log,
          `Webhook push delivered to ${describeSubscription(subscription)}`,
        ),
      )
      .catch((error) => {
        // Webhook delivery failures never auto-delete the subscription:
        // unlike web (404/410) and FCM (registration-token-not-registered),
        // a webhook has no reliable dead-endpoint signal, so a transient
        // outage must not wipe a live one.
        logFailure(
          jobLog,
          log,
          `webhook push to ${describeSubscription(subscription)} failed`,
          error,
        );
      });
  }

  await sendAppIOSPushNotifications(
    apnSubscriptions,
    payloadData,
    notification,
    jobLog,
  );

  await sendAppFCMPushNotifications(
    fcmSubscriptions,
    payloadData,
    notification,
    account,
    jobLog,
  );

  await logStep(
    jobLog,
    log,
    `Finished push delivery for account ${account.id} (${account.email})`,
  );
};

export const sendTestPushNotification = async (
  account: Account,
  profile: ProfileWithMeta,
  subscriptionKey: string,
) => {
  const notificationStats = await getNotificationStats(profile);

  const notification: PushNotification = {
    title: 'Test',
    options: {
      body: `This is a test notification for @${profile.handle} and the account ${account.email}`,
    },
  };

  const payload: PushPayload = {
    notification,
    notificationStats,
  };
  const subscriptions = await listPushSubscriptionsByAccount(account);
  const webSubscription = subscriptions
    .filter((s) => s.type === 'web')
    .find((s) => s?.keys?.auth === subscriptionKey);
  if (webSubscription) {
    await sendWebPushNotification(webSubscription, payload)
      .catch(async (error) => {
        log.error(error);
        // web-push rejects with { statusCode } for >= 400. Only 404/410 mean
        // the endpoint is gone; a transient 403/429 or status-less network
        // error must not delete a live subscription (mirrors doPush).
        const statusCode = (error as { statusCode?: number } | undefined)
          ?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await deletePushSubscription(webSubscription.id).catch(
            (deleteError) =>
              log.error(
                `failed to remove dead test-push subscription`,
                deleteError,
              ),
          );
        }
        throw error;
      })
      .then((r) => {
        if (!r?.statusCode || r.statusCode >= 400) log.error(r);
      });
    return;
  }

  const webhookSubscription = subscriptions
    .filter((s) => s.type === 'webhook')
    .find((s) => s.publicKey === subscriptionKey || s.url === subscriptionKey);
  if (webhookSubscription) {
    await sendWebhookPushNotification(webhookSubscription, payload).catch(
      async (error) => {
        log.error(error);
        // Only a gone webhook endpoint (404/410) justifies deleting the
        // subscription — a transient 5xx/timeout must not wipe a live one
        // (mirrors the web-path guard above).
        const statusCode =
          error instanceof WebhookPushError ? error.statusCode : undefined;
        if (statusCode === 404 || statusCode === 410) {
          await deletePushSubscription(webhookSubscription.id).catch(
            (deleteError) =>
              log.error(
                `failed to remove dead test-push webhook subscription`,
                deleteError,
              ),
          );
        }
        throw error;
      },
    );
    return;
  }

  throw new Error('Subscription not found');
};
