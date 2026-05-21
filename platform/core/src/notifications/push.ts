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
) => {
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

  return await iosClient.sendMany(notifications).catch();
};

const sendAppFCMPushNotifications = async (
  subscriptions: Extract<PushSubscription, { type: 'fcm' }>[],
  payload: PushPayload,
  notification: PushNotification,
) => {
  const serializedPayload = JSON.stringify(payload);
  const tokens = subscriptions.map((sub) => sub.fcmToken);
  if (firebase.apps.length === 0) {
    return;
  }
  const result = await firebase.messaging().sendEachForMulticast({
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
  })

  log.info(notification)
  log.info('result', result.responses);
};
export const doPush = async (
  notification: PushNotification | undefined,
  notificationStats: NotificationStats,
  account: Account,
) => {
  if (!notification) {
    return;
  }

  const payloadData = {
    notification,
    notificationStats,
  };

  const subscriptions = await listPushSubscriptionsByAccount(account);

  for (const subscription of subscriptions
    .filter((sub) => sub.type === 'web')
    .filter(Boolean)) {
    await sendWebPushNotification(subscription, payloadData)
      .catch((error) => {
        log.error(error);
        return deletePushSubscription(subscription.id);
      })
      .catch(() => undefined);
  }

  for (const subscription of subscriptions.filter(
    (sub): sub is Extract<PushSubscription, { type: 'webhook' }> =>
      sub.type === 'webhook',
  )) {
    await sendWebhookPushNotification(subscription, payloadData)
      .catch((error) => {
        log.error(error);
        return undefined;
      });
  }

  await sendAppIOSPushNotifications(
    subscriptions.filter(
      (sub) => sub.type === 'apn',
    ),
    payloadData,
    notification,
  );

  await sendAppFCMPushNotifications(
    subscriptions.filter(
      (sub) => sub.type === 'fcm',
    ),
    payloadData,
    notification,
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
  const subscription = subscriptions.filter(
    (s) => s.type === 'web'
  ).find(
    (s) => s?.keys?.auth === subscriptionKey,
  );
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
