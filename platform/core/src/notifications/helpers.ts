import {
  NotificationData,
  ProfileWithMeta,
  ProfileNotificationSettings,
  ExpandedNotification,
  notificationDefaults,
  Notification,
  DbNotification,
  ProfileSettings,
} from '@openpeeps/common/types';
import { allpeepDb } from '../db';
import { notificationsMapping, unexpandedNotificationsMapping } from './mapping';
import { Mapping } from '@openpeeps/arango-querybuilder';
import { defaultNotificationTypes } from './defaultNotifications';
import { getProfile } from '../profiles/cache';
import { transformPost } from '../posts';
import { notificationHandlers } from './handlers';

export const baseListNotifications = (profile: ProfileWithMeta): Mapping<NotificationData, DbNotification> =>
  notificationsMapping.filter(`DOC.profileId == '${profile.id}'`);


export const notificationSettings = (
  profileSettings: ProfileSettings,
  type: NotificationData['type'],
): ProfileNotificationSettings =>
  profileSettings?.notifications?.[type] ??
  defaultNotificationTypes.find(t => t.type === type)?.defaultSettings ?? notificationDefaults;

export const expandNotification = async (notification: DbNotification): Promise<ExpandedNotification> => {

  const intermediateNotification = {
    ...notification,
    senderProfile: notification.fromProfileId ? await getProfile(notification.fromProfileId) : undefined,
    post: notification.post ? await transformPost(notification.post) : undefined,
    recipientProfile: (await getProfile(notification.profileId))!,
  };

  return (await notificationHandlers
    .get(notification.type)
    ?.expander?.(intermediateNotification)) ||
    intermediateNotification;
}

const baseStatNotificationsMapping = (profile: ProfileWithMeta): Mapping<NotificationData, Notification> =>
  unexpandedNotificationsMapping.filter(`DOC.profileId == '${profile.id}'`);

export const unseenNotifications = (profile: ProfileWithMeta) => allpeepDb().then(
  ({ db }) => baseStatNotificationsMapping(profile).filter('!DOC.seen').count(db)
);

export const unreadNotifications = (profile: ProfileWithMeta) => allpeepDb().then(
  ({ db }) => baseStatNotificationsMapping(profile).filter('!DOC.read').count(db)
);