import type { PushMessage, PushSubscriptionData } from '@openpeeps/common';
import { getApp } from '@react-native-firebase/app';
import {
    FirebaseMessagingTypes,
    getToken,
    requestPermission,
    AuthorizationStatus,
    onMessage,
    onNotificationOpenedApp,
    setBackgroundMessageHandler
} from '@react-native-firebase/messaging';
import notifee, { Event, EventType } from '@notifee/react-native';
import { setAppBadgeCount } from './notification-helpers';
import { MainStackParamList } from '../components/navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { buildGoto } from '../components/navigation/helpers';
import { handleInternalURLNavigation } from './utils';

const messageToPushNotification = (message: FirebaseMessagingTypes.RemoteMessage): PushMessage | false =>
    !!message.data?.payload && JSON.parse(message.data.payload as string) as PushMessage;

const handleRemoteMessage = async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
    const pushNotification = messageToPushNotification(remoteMessage);
    if (!pushNotification) {
        return;
    }
    const { notification, notificationStats } = pushNotification;
    setAppBadgeCount(notificationStats.unseen);

    if (notification) {
        await notifee.displayNotification({
            title: notification.title,
            body: notification.options?.body,
            data: {
                defaultAction: notification.options?.actions?.[0]?.action,
            },
            android: {
                largeIcon: notification.options?.icon ?? 'ic_launcher',
                channelId: 'default',
                pressAction: {
                    id: 'default',
                },
            },
        });
        console.log('notification displayed');
    }
};



export const registerMessageHandler = async (navigation: NativeStackNavigationProp<MainStackParamList>,) => {

    const goto = buildGoto(navigation);

    const handleNotificationEvent = async (event: Event) => {
        if (event.type === EventType.PRESS) {
            console.log('default action', event.detail?.notification?.data?.defaultAction);
            if (typeof event.detail?.notification?.data?.defaultAction === 'string') {
                handleInternalURLNavigation(event.detail?.notification?.data?.defaultAction, goto);
            }
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
    onMessage(app.messaging(), async remoteMessage => {
        console.log('Message handled in the foreground!', remoteMessage);
        handleRemoteMessage(remoteMessage);
    });
    onNotificationOpenedApp(app.messaging(), async remoteMessage => {
        handleRemoteMessage(remoteMessage);
    });
    setBackgroundMessageHandler(app.messaging(), async remoteMessage => {
        handleRemoteMessage(remoteMessage);
    });

    notifee.onBackgroundEvent(async (event) => {
        handleNotificationEvent(event);
    });

    notifee.onForegroundEvent(async (event) => {
        handleNotificationEvent(event);
    });
};



export const initializePushNotifications = async (
    pushSubscriptions: PushSubscriptionData[]
): Promise<PushSubscriptionData | undefined> => {

    const app = getApp();

    const authStatus = await requestPermission(app.messaging());
    const enabled = authStatus === AuthorizationStatus.AUTHORIZED || authStatus === AuthorizationStatus.PROVISIONAL;

    try {
        if (enabled) {
            const token = await getToken(app.messaging());
            if (
                pushSubscriptions
                    .find(subscription => subscription.type === 'fcm' && subscription.fcmToken === token)
            ) {
                return;
            }

            return {
                type: 'fcm',
                fcmToken: token,
            } as PushSubscriptionData;
        }
    } catch (error) {
        console.info('Error initializing push notifications');
    }
};
