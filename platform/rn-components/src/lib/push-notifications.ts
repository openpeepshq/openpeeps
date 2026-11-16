import { useEffect } from 'react';
import type { PushMessage, PushSubscriptionData, PushSubscription } from '@openpeepshq/common';
import type { OpenpeepsClient } from '@openpeepshq/client';
import { getApp } from '@react-native-firebase/app';
import {
  FirebaseMessagingTypes,
  getToken,
  requestPermission,
  AuthorizationStatus,
  onMessage,
  onNotificationOpenedApp,
  getInitialNotification,
  setBackgroundMessageHandler,
} from '@react-native-firebase/messaging';
import notifee, { Event, EventType } from '@notifee/react-native';
import { setAppBadgeCount } from './notification-helpers';
import { handlePushOnNotificationsScreen } from './notifications-screen-state';
import { MainStackParamList } from '../components/navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { buildGoto } from '../components/navigation/helpers';
import { handleInternalURLNavigation } from './utils';
import {
  consumePendingPushAction,
  setPendingPushAction,
} from './push-notification-navigation';
import './push-notifications-background';

const messageToPushNotification = (
  message: FirebaseMessagingTypes.RemoteMessage
): PushMessage | undefined =>
  message.data?.payload
    ? (JSON.parse(message.data.payload as string) as PushMessage)
    : undefined;

export const getDefaultActionFromRemoteMessage = (
  remoteMessage: FirebaseMessagingTypes.RemoteMessage
): string | undefined => {
  const pushNotification = messageToPushNotification(remoteMessage);
  const action = pushNotification?.notification?.options?.actions?.[0]?.action;
  return typeof action === 'string' ? action : undefined;
};

const updateBadgeFromRemoteMessage = async (
  remoteMessage: FirebaseMessagingTypes.RemoteMessage
) => {
  const pushNotification = messageToPushNotification(remoteMessage);
  if (!pushNotification) {
    return;
  }

  const { notificationStats } = pushNotification;
  const handledOnNotificationsScreen = await handlePushOnNotificationsScreen(
    notificationStats.unseen
  );
  if (!handledOnNotificationsScreen) {
    setAppBadgeCount(notificationStats.unseen);
  }
};

const displayRemoteMessageNotification = async (
  remoteMessage: FirebaseMessagingTypes.RemoteMessage
) => {
  const pushNotification = messageToPushNotification(remoteMessage);
  if (!pushNotification?.notification) {
    return;
  }

  const { notification } = pushNotification;
  const defaultAction = notification.options?.actions?.[0]?.action;

  await notifee.displayNotification({
    title: notification.title,
    body: notification.options?.body,
    data: defaultAction ? { defaultAction } : undefined,
    android: {
      largeIcon: notification.options?.icon ?? 'ic_launcher',
      channelId: 'default',
      pressAction: {
        id: 'default',
      },
    },
  });
};

const handleRemoteMessage = async (
  remoteMessage: FirebaseMessagingTypes.RemoteMessage
) => {
  await updateBadgeFromRemoteMessage(remoteMessage);
  await displayRemoteMessageNotification(remoteMessage);
};

const navigateFromPushAction = (
  defaultAction: string,
  goto: ReturnType<typeof buildGoto>
) => {
  handleInternalURLNavigation(defaultAction, goto);
};

const handleNotificationOpen = (
  remoteMessage: FirebaseMessagingTypes.RemoteMessage,
  goto?: ReturnType<typeof buildGoto>
) => {
  const defaultAction = getDefaultActionFromRemoteMessage(remoteMessage);
  if (!defaultAction) {
    return;
  }

  if (goto) {
    navigateFromPushAction(defaultAction, goto);
    return;
  }

  setPendingPushAction(defaultAction);
};

export const registerMessageHandler = async (
  navigation: NativeStackNavigationProp<MainStackParamList>
) => {
  const goto = buildGoto(navigation);

  const handleNotificationEvent = async (event: Event) => {
    if (event.type !== EventType.PRESS) {
      return;
    }

    const defaultAction = event.detail?.notification?.data?.defaultAction;
    if (typeof defaultAction === 'string') {
      navigateFromPushAction(defaultAction, goto);
    }
  };

  await notifee.requestPermission();

  await notifee.createChannel({
    id: 'default',
    name: 'Default Channel',
  });
  await notifee.setNotificationCategories([
    {
      id: 'default',
    },
  ]);

  const app = getApp();

  const pendingAction = consumePendingPushAction();
  if (pendingAction) {
    navigateFromPushAction(pendingAction, goto);
  } else {
    const initialNotification = await getInitialNotification(app.messaging());
    if (initialNotification) {
      await updateBadgeFromRemoteMessage(initialNotification);
      handleNotificationOpen(initialNotification, goto);
    }
  }

  const unsubscribeOnMessage = onMessage(
    app.messaging(),
    async (remoteMessage) => {
      await handleRemoteMessage(remoteMessage);
    }
  );
  const unsubscribeOpened = onNotificationOpenedApp(
    app.messaging(),
    async (remoteMessage) => {
      await updateBadgeFromRemoteMessage(remoteMessage);
      handleNotificationOpen(remoteMessage, goto);
    }
  );
  setBackgroundMessageHandler(app.messaging(), async (remoteMessage) => {
    await handleRemoteMessage(remoteMessage);
  });

  const unsubscribeForeground = notifee.onForegroundEvent(async (event) => {
    await handleNotificationEvent(event);
  });

  return () => {
    unsubscribeOnMessage();
    unsubscribeOpened();
    unsubscribeForeground();
  };
};

export const useRegisterPushMessageHandler = (
  navigation: NativeStackNavigationProp<MainStackParamList>
) => {
  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    void registerMessageHandler(navigation).then((unsub) => {
      if (cancelled) {
        unsub();
        return;
      }
      unsubscribe = unsub;
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [navigation]);
};

let fcmRegistration: Promise<PushSubscriptionData | undefined> | undefined;

const registerFcmToken = async (
  pushSubscriptions: PushSubscriptionData[]
): Promise<PushSubscriptionData | undefined> => {
  const app = getApp();

  const authStatus = await requestPermission(app.messaging());
  const enabled =
    authStatus === AuthorizationStatus.AUTHORIZED ||
    authStatus === AuthorizationStatus.PROVISIONAL;

  try {
    if (enabled) {
      const token = await getToken(app.messaging());
      if (
        pushSubscriptions.find(
          (subscription) =>
            subscription.type === 'fcm' && subscription.fcmToken === token
        )
      ) {
        return;
      }

      return {
        type: 'fcm',
        fcmToken: token,
      } as PushSubscriptionData;
    }
  } catch {
    console.info('Error initializing push notifications');
  }
};

export const initializePushNotifications = async (
  pushSubscriptions: PushSubscriptionData[]
): Promise<PushSubscriptionData | undefined> => {
  if (!fcmRegistration) {
    fcmRegistration = registerFcmToken(pushSubscriptions).finally(() => {
      fcmRegistration = undefined;
    });
  }
  return fcmRegistration;
};

/** Find the current device's FCM token, delete its server subscription,
 * and drop the local FCM registration so the next login registers fresh.
 * Called during logout before credentials are cleared. */
export const unregisterPushForLogout = async (
  pushSubscriptions: PushSubscription[],
  client: OpenpeepsClient
): Promise<void> => {
  let token: string | undefined;
  try {
    const app = getApp();
    token = await getToken(app.messaging());
  } catch {
    // No FCM token available; nothing to clean up locally.
  }
  if (!token) return;

  const sub = pushSubscriptions.find(
    (subscription) =>
      subscription.type === 'fcm' && subscription.fcmToken === token
  );
  if (!sub) return;

  // Delete the server-side subscription row for this device.
  const handleResult = <T>(r: { data: T } | { error: unknown }): T => {
    if ('data' in r) return r.data;
    throw r.error;
  };
  try {
    await client.accounts.current.deletePushSubcription({
      pushSubscriptionId: sub.id,
    }).then(handleResult);
  } catch {
    // Best-effort logging; callers handle errors gracefully.
  }

  // Drop the local FCM registration so the next login registers fresh.
  try {
    const app = getApp();
    await app.messaging().deleteToken();
  } catch {
    // Token may already be gone; ignore.
  }
};

const shorten = (value: string) =>
  value.length > 14 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value;
