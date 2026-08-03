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
import { anonymizeProfileIfDeleted } from '@openpeeps/common/lib';
import { allpeepDb } from '../db';
import { notificationFilters } from '../db/pg/filters';
import {
  notificationsMapping,
  unexpandedNotificationsMapping,
} from './mapping';
import type { Mapping } from '../db/pg/map';
import { defaultNotificationTypes } from './defaultNotifications';
import { getProfile } from '../profiles/cache';
import { transformPost } from '../posts';
import { notificationHandlers } from './handlers';

export const baseListNotifications = (
  profile: ProfileWithMeta,
): Mapping<NotificationData, DbNotification> =>
  notificationsMapping.filter(notificationFilters.forProfile(profile.id));

export const notificationSettings = (
  profileSettings: ProfileSettings,
  type: NotificationData['type'],
): ProfileNotificationSettings =>
  profileSettings?.notifications?.[type] ??
  defaultNotificationTypes.find((t) => t.type === type)?.defaultSettings ??
  notificationDefaults;

export const expandNotification = async (
  notification: DbNotification,
): Promise<ExpandedNotification> => {
  const intermediateNotification = {
    ...notification,
    senderProfile: notification.fromProfileId
      ? anonymizeProfileIfDeleted(await getProfile(notification.fromProfileId))
      : undefined,
    post: notification.post
      ? await transformPost(notification.post)
      : undefined,
    recipientProfile: (await getProfile(notification.profileId))!,
  };

  return (
    (await notificationHandlers
      .get(notification.type)
      ?.expander?.(intermediateNotification)) || intermediateNotification
  );
};

const baseStatNotificationsMapping = (
  profile: ProfileWithMeta,
): Mapping<NotificationData, Notification> =>
  unexpandedNotificationsMapping.filter(
    notificationFilters.forProfile(profile.id),
  );

export const unseenNotifications = (profile: ProfileWithMeta) =>
  allpeepDb().then(({ db }) =>
    baseStatNotificationsMapping(profile)
      .filter(notificationFilters.unseen())
      .count(db),
  );

export const unreadNotifications = (profile: ProfileWithMeta) =>
  allpeepDb().then(({ db }) =>
    baseStatNotificationsMapping(profile)
      .filter(notificationFilters.unread())
      .count(db),
  );
