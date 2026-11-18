import {
  accountsMapping,
  pushSubscriptionsRelation,
} from '../accounts/mapping';
import { Account, PushSubscription } from '@openpeepshq/common/types';
import { allpeepDb } from '../db';
import { pushSubscriptionsMapping } from './mapping';

export const findPushSubscription = (id: string) =>
  allpeepDb().then((db) => pushSubscriptionsMapping.find(db.db, id));

/** Owner of a subscription's account edge, if one is linked. */
export const findAccountForPushSubscription = (
  subscription: PushSubscription,
) =>
  allpeepDb().then(({ db }) =>
    pushSubscriptionsMapping
      .relationsFrom(subscription, {
        alias: 'account',
        edgeCollection: 'accountToPushSubscription',
        direction: 'INBOUND',
        skipEdge: true,
        mapping: accountsMapping.data(),
        cardinality: 'many',
      })
      .first(db),
  );

export const listPushSubscriptionsByAccount = (account: Account) =>
  allpeepDb().then(({ db }) =>
    accountsMapping.relationsFrom(account, pushSubscriptionsRelation).all(db),
  );
