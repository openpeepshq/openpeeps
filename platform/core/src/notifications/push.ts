import {
  Account,
  PushPayload,
  NotificationStats,
  ProfileWithMeta,
  PushNotification,
  PushSubscription,
} from '@openpeeps/common/types';
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
import firebase from 'firebase-admin';
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
    throw new Error(`Webhook push failed with status ${response.status}`);
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

const sendAppFCMPushNotifications = async (
  subscriptions: Extract<PushSubscription, { type: 'fcm' }>[],
  payload: PushPayload,
  notification: PushNotification,
  jobLog?: JobLog,
) => {
  if (subscriptions.length === 0) return;

  const serializedPayload = JSON.stringify(payload);
  const tokens = subscriptions.map((sub) => sub.fcmToken);
  if (firebase.apps.length === 0) {
    await logFailure(
      jobLog,
      log,
      `FCM not initialized; skipping ${tokens.length} Android push(es)`,
    );
    return;
  }

  await logStep(jobLog, log, `Sending FCM push to ${tokens.length} device(s)`);

  let result: Awaited<
    ReturnType<ReturnType<typeof firebase.messaging>['sendEachForMulticast']>
  >;
  try {
    result = await firebase.messaging().sendEachForMulticast({
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
    await logFailure(
      jobLog,
      log,
      `FCM sendEachForMulticast threw for ${tokens.length} device(s)`,
      error,
    );
    return;
  }

  for (let i = 0; i < result.responses.length; i++) {
    const response = result.responses[i];
    if (!response.success) {
      await logFailure(
        jobLog,
        log,
        `FCM push to ${describeSubscription(subscriptions[i])} failed`,
        response.error,
      );
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

  const webSubscriptions = subscriptions.filter((sub) => sub.type === 'web');
  const webhookSubscriptions = subscriptions.filter(
    (sub): sub is Extract<PushSubscription, { type: 'webhook' }> =>
      sub.type === 'webhook',
  );
  const apnSubscriptions = subscriptions.filter((sub) => sub.type === 'apn');
  const fcmSubscriptions = subscriptions.filter((sub) => sub.type === 'fcm');

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
        await logFailure(
          jobLog,
          log,
          `web push to ${describeSubscription(subscription)} failed; removing dead subscription`,
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
      .catch((error) =>
        logFailure(
          jobLog,
          log,
          `webhook push to ${describeSubscription(subscription)} failed`,
          error,
        ),
      );
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
  const subscription = subscriptions
    .filter((s) => s.type === 'web')
    .find((s) => s?.keys?.auth === subscriptionKey);
  if (subscription) {
    await sendWebPushNotification(subscription, payload)
      .catch(async (error) => {
        log.error(error);
        await deletePushSubscription(subscription.id);
        throw error;
      })
      .then((r) => {
        if (!r?.statusCode || r.statusCode >= 400) log.error(r);
      });
  } else {
    throw new Error('Subscription not found');
  }
};
