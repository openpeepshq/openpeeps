import { Account, PushSubscriptionData } from '@openpeepshq/common/types';
import { pushSubscriptionsMapping } from './mapping';
import { allpeepDb } from '../db';
import { pushSubscriptionAccountConnector } from './helpers';

const uniqueCredential = (data: PushSubscriptionData) => {
  switch (data.type) {
    case 'web':
      return { type: data.type, endpoint: data.endpoint };
    case 'webhook':
      return { type: data.type, url: data.url };
    case 'apn':
      return { type: data.type, apnToken: data.apnToken };
    case 'fcm':
      return { type: data.type, fcmToken: data.fcmToken };
  }
};

export const createPushSubscription = async (
  account: Account,
  data: PushSubscriptionData,
) => {
  const db = await allpeepDb().then((db) => db.db);
  const existingPushSubscription = await pushSubscriptionsMapping
    .filter({
      matches: uniqueCredential(data),
    })
    .first(db);

  if (existingPushSubscription) {
    // Relink the existing subscription to the new account so that
    // logins on this device register the new account as well.
    await pushSubscriptionAccountConnector(db, account, existingPushSubscription);
    return existingPushSubscription;
  }

  const pushSubscription = await pushSubscriptionsMapping.create(db, data);
  await pushSubscriptionAccountConnector(db, account, pushSubscription);
  return pushSubscription;
};

export const deletePushSubscription = async (id: string) => {
  const db = await allpeepDb().then((db) => db.db);
  return pushSubscriptionsMapping.delete(db, id);
};
