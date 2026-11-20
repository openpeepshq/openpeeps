import {
  DbNotification,
  ExpandedNotification,
  NotificationStats,
  ProfileWithMeta,
} from '@openpeepshq/common/types';
import { allpeepDb } from '../db';
import { addStart, filterAndTransform } from '../db/helpers';
import { notificationFilters } from '../db/pg/filters';
import {
  baseListNotifications,
  expandNotification,
  unreadNotifications,
  unseenNotifications,
} from './helpers';

export const findNotification = (
  profile: ProfileWithMeta,
  notificationId: string,
) =>
  allpeepDb()
    .then(({ db }) => baseListNotifications(profile).find(db, notificationId))
    .then((notification) =>
      notification?.profileId === profile.id
        ? expandNotification(notification)
        : undefined,
    );

export const listNotificationsByProfile = (
  profile: ProfileWithMeta,
  {
    start,
    limit = 100,
    excludeTypes,
  }: { start?: string; limit?: number; excludeTypes?: string[] } = {
    limit: 100,
  },
) =>
  allpeepDb().then(({ db }) => {
    // Applying the exclusion to the mapping (not post-fetch) keeps
    // `limit` = visible items per page, which the client relies on to know
    // when the feed is exhausted. Same `typesNotIn` predicate "mark all as
    // seen" (setAllSeen) applies.
    const base = baseListNotifications(profile);
    const filtered = base.filter(
      excludeTypes?.length
        ? notificationFilters.typesNotIn(excludeTypes)
        : undefined,
    );
    return filterAndTransform<DbNotification, ExpandedNotification>(
      addStart<DbNotification>(filtered, start),
      db,
      { transform: expandNotification, limit },
    );
  });

export const getNotificationStats = async (
  profile: ProfileWithMeta,
): Promise<NotificationStats> => ({
  unread: await unreadNotifications(profile),
  unseen: await unseenNotifications(profile),
});
