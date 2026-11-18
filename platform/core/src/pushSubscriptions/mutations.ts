import { Account, PushSubscriptionData } from '@openpeepshq/common/types';
import { pushSubscriptionsMapping } from './mapping';
import { allpeepDb } from '../db';
import {
  pushSubscriptionAccountConnector,
  pushSubscriptionAccountDisconnector,
} from './helpers';
import { findAccountForPushSubscription } from './finders';

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
    // Re-linking to a different account must switch the edge, not add one:
    // account_to_push_subscription allows parallel edges, and a stale second
    // edge makes doPush treat the shared token as a duplicate and delete it.
    const previousAccount = await findAccountForPushSubscription(
      existingPushSubscription,
    );
    if (previousAccount && previousAccount.id !== account.id) {
      await pushSubscriptionAccountDisconnector(
        db,
        previousAccount,
        existingPushSubscription,
      );
      // The new account may already hold a (stale) edge to this subscription —
      // the parallel-edge state created before the relink guard existed. Drop
      // it first so the connect below is the only edge for the new account,
      // keeping the single-edge invariant airtight (doPush would otherwise
      // collapse the duplicate only later).
      await pushSubscriptionAccountDisconnector(
        db,
        account,
        existingPushSubscription,
      );
      await pushSubscriptionAccountConnector(
        db,
        account,
        existingPushSubscription,
      );
    }
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
