import notifee, { EventType } from '@notifee/react-native';
import { setPendingPushAction } from './push-notification-navigation';

notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type !== EventType.PRESS) {
    return;
  }

  const defaultAction = detail.notification?.data?.defaultAction;
  if (typeof defaultAction === 'string') {
    setPendingPushAction(defaultAction);
  }
});
