import { notificationsMapping } from './mapping';
import { allpeepDb } from '../db';
import { notificationFilters } from '../db/pg/filters';
import {
  DbNotification,
  ExpandedNotification,
  NotificationData,
  ProfileWithMeta,
  PublicProfile,
} from '@openpeeps/common/types';
import {
  baseListNotifications,
  expandNotification,
  notificationSettings,
} from './helpers';
import { hub } from '../events';
import { findProfile } from '../profiles';
import { logger } from '../log';
import { findProfileSettings } from '../profileSettings';

const log = logger('openpeeps:notifications');

export const updateNotification = async (
  notification: ExpandedNotification | DbNotification,
  data: Partial<NotificationData>,
) => {
  const db = await allpeepDb().then((db) => db.db);
  return notificationsMapping.update(db, notification.id, data);
};

export const setNotificationRead = async (
  notification: ExpandedNotification | DbNotification,
) => updateNotification(notification, { read: true });
export const setNotificationSeen = async (
  notification: ExpandedNotification | DbNotification,
) => updateNotification(notification, { seen: true });

export const setAllSeen = async (profile: ProfileWithMeta) =>
  allpeepDb()
    .then(({ db }) =>
      baseListNotifications(profile)
        .filter(notificationFilters.unseen())
        .all(db),
    )
    .then((notifications) =>
      notifications.map((notification) => setNotificationSeen(notification)),
    );

export const maybeCreateNotification = async (
  profile: PublicProfile,
  data: Omit<NotificationData, 'profileId'>,
) => {
  const type = data.type;

  const fullProfile = await findProfile(profile.id);

  if (!fullProfile) {
    log.error(`Profile ${profile.id} not found`);
    return;
  }
  const profileSettings = await findProfileSettings(profile.id);
  if (!profileSettings) {
    log.error(`profileSettings ${profile.id} not found`);
    return;
  }
  const settings = notificationSettings(profileSettings, type);

  if (settings.create) {
    const notificationData: NotificationData = {
      ...data,
      profileId: profile.id,
    } as NotificationData;

    const notification = await allpeepDb().then(({ db }) =>
      notificationsMapping.create(db, notificationData),
    );
    const expandedNotification = await expandNotification(notification);
    await hub.emit('notificationCreated', expandedNotification);
  }
};
