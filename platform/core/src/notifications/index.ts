import { hub } from '../events';
import { passwordPlaceHolder } from '@openpeeps/common/types';
import { config, updateConfigValues } from '../config';
import webPush from 'web-push';
import { initializeFirebase } from './firebase';
import { notificationQueue } from './jobs';
export { maybeCreateNotification } from './mutations';
export {
  registerDefaultNotifications,
  defaultNotificationTypes,
} from './defaultNotifications';
export { registerNotificationHandler } from './handlers';
export { sendTestPushNotification } from './push';
export { notificationQueue, notificationWorker } from './jobs';

export * from './mutations';
export * from './finders';

const { generateVAPIDKeys } = webPush;

let initialized = false;

export const initializeNotifications = async () => {
  if (initialized) {
    return;
  }
  initialized = true;
  console.log('Initializing notifications...');
  await initializeFirebase();
  const coreConfig = await config();

  if (
    !coreConfig.vapid.privateKey ||
    coreConfig.vapid.privateKey === passwordPlaceHolder
  ) {
    const vapid = generateVAPIDKeys();
    await updateConfigValues({
      vapid,
    });
  }
  console.log(
    'Notifications initialized. Set up notification queue listener on hub.',
  );
  hub.on('notificationCreated', async (...args) => {
    const notification = args[0];
    try {
      const queue = notificationQueue();
      await queue.add('process-notification', notification);
    } catch (error) {
      console.error('Failed to queue notification:', error);
    }
  });
};
