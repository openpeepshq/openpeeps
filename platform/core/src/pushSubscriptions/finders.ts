import { pushSubscriptionsRelation } from '../accounts/mapping';
import { Account } from '@openpeepshq/common/types';
import { accountsMapping } from '../accounts/mapping';
import { allpeepDb } from '../db';
import { pushSubscriptionsMapping } from './mapping';

export const findPushSubscription = (id: string) =>
  allpeepDb().then((db) => pushSubscriptionsMapping.find(db.db, id));

export const listPushSubscriptionsByAccount = (account: Account) =>
  allpeepDb().then(({ db }) =>
    accountsMapping.relationsFrom(account, pushSubscriptionsRelation).all(db),
  );
