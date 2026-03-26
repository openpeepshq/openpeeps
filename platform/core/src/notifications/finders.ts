import { DbNotification, ExpandedNotification, NotificationStats, ProfileWithMeta } from "@openpeeps/common/types";
import { allpeepDb } from "../db";
import { addStart, filterAndTransform } from "../db/helpers";
import { baseListNotifications, expandNotification, unreadNotifications, unseenNotifications } from "./helpers";

export const findNotification = (profile: ProfileWithMeta, notificationId: string) =>
    allpeepDb()
        .then(({ db }) => baseListNotifications(profile).find(db, notificationId))
        .then(notification => notification?.profileId === profile.id ? expandNotification(notification) : undefined);

export const listNotificationsByProfile = (profile: ProfileWithMeta, { start, limit = 100 }: { start?: string, limit?: number } = { limit: 100 }) =>
    allpeepDb().then(
        ({ db }) => filterAndTransform<DbNotification, ExpandedNotification>(
            addStart<DbNotification>(baseListNotifications(profile), start), db, { transform: expandNotification, limit }));

export const getNotificationStats = async (profile: ProfileWithMeta): Promise<NotificationStats> => ({
    unread: await unreadNotifications(profile),
    unseen: await unseenNotifications(profile),
})
