import { Account, PushSubscriptionData } from '@openpeeps/common/types';
import { pushSubscriptionsMapping } from './mapping';
import { allpeepDb } from '../db';
import { pushSubscriptionAccountConnector } from './helpers';

export const createPushSubscription = async (
  account: Account,
  data: PushSubscriptionData,
) => {
  const db = await allpeepDb().then((db) => db.db);
  const existingPushSubscription = await pushSubscriptionsMapping.filter({
    matches: data
  }).first(db);

  if (existingPushSubscription) {
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
