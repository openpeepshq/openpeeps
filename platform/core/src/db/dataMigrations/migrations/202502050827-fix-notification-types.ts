import { Database } from 'arangojs';
import { transformDocsInCollection } from '../helpers';
import { Notification } from '@openpeepshq/common/types';
import { camelCase } from 'change-case';

export default {
  key: '0194d539-06ac-750c-9577-e982464575ae',
  info: 'Fixing notification type',
  migration: async (db: Database) =>
    transformDocsInCollection(db, 'notifications', (doc) => {
      const oldNotification = doc as Notification;
      return {
        ...oldNotification,
        type: camelCase(oldNotification.type),
      };
    }),
};
