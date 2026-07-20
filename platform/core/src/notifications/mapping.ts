import {
  DbNotification,
  Notification,
  NotificationData,
} from '@openpeeps/common/types';
import { map } from '../db/pg/map';
import { postsMapping } from '../posts/mapping';

export const unexpandedNotificationsMapping = map<
  NotificationData,
  Notification
>({
  collection: 'notifications',
  softDelete: false,
});

export const notificationsMapping = map<NotificationData, DbNotification>({
  collection: 'notifications',
  postFilterForeignKeyRelations: [
    {
      alias: 'post',
      foreignKeyProperty: 'postId',
      mapping: postsMapping.data(),
    },
    {
      alias: 'group',
      foreignKeyProperty: 'groupId',
      mapping: {
        collection: 'groups',
        softDelete: true,
      },
    },
  ],
  softDelete: false,
});
