import { hub } from '../events';
import {
  passwordPlaceHolder,
  ExpandedNotification,
  Json,
} from '@openpeeps/common/types';
import { emailService } from '../email';
import { config, updateConfig } from '../config';
import webPush from 'web-push';
import { findProfile } from '../profiles';
import { notificationSettings } from './helpers';
import { notificationHandlers } from './handlers';
import { doPush } from './push';
import { findByProfile } from '../accounts';
import { updateNotification } from './mutations';
import { getNotificationStats } from './finders';
import { initializeFirebase } from './firebase';
import { findProfileSettings } from '../profileSettings';
export { maybeCreateNotification } from './mutations';
export { registerDefaultNotifications, defaultNotificationTypes } from './defaultNotifications';
export { registerNotificationHandler } from './handlers';
export { sendTestPushNotification } from './push';

export * from './mutations';
export * from './finders';

const { generateVAPIDKeys } = webPush;

let initialized = false;

export const initializeNotifications = async () => {
  if (initialized) {
    return;
  }
  initialized = true;
  await initializeFirebase();
  const coreConfig = await config();

  if (
    !coreConfig.vapid.privateKey ||
    coreConfig.vapid.privateKey === passwordPlaceHolder
  ) {
    const vapid = generateVAPIDKeys();
    await updateConfig({
      vapid,
    });
  }
  hub.once('notificationCreated', async (...args) => {
    const notification = args[0] as ExpandedNotification;


    console.log('notification', notification);
    const profile = await findProfile(notification.recipientProfile.id);
    
    if (!profile) {
      return;
    }
    const profileSettings = await findProfileSettings(profile.id);
    
    if (!profileSettings) {
      return;
    }
    
    const { push, email } = notificationSettings(profileSettings, notification.type);

    const accounts = await findByProfile(profile);
    const mailer = await emailService();

    const notificationStats = await getNotificationStats(profile);

    for (const account of accounts) {
      if (email) {
        await mailer.send({
          template: `notification-${notification.type}`,
          to: account.email,
          locals: notification as unknown as Record<string, Json>,
          // this typecast is necessary but ExpandedNotification is guaranteed to satisfy it
        });
      }

      if (push) {
        await doPush(
          await notificationHandlers
            .get(notification.type)
            ?.pushRenderer(notification),
          notificationStats,
          account,
        );
      }
    }
    await updateNotification(notification, {
      emailHandled: true,
      pushHandled: true,
    });
  });
};


