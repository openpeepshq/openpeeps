import { NotificationHandler } from '@openpeepshq/common/types';
import { CoreEventKey, hub } from '../events';

export const notificationHandlers = new Map<string, NotificationHandler>();

export const registerNotificationHandler = (handler: NotificationHandler) => {
  notificationHandlers.set(handler.type, handler);
  hub.once(handler.event as CoreEventKey, handler.eventHandler);
};
