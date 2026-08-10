import { Account, PushSubscription } from '@openpeepshq/common/types';
import { connector } from '../db/helpers';
import { collectionInfos } from '../db';

export const pushSubscriptionAccountConnector = connector<
  Account,
  PushSubscription
>(
  collectionInfos.accountsCollection,
  collectionInfos.pushSubscriptionsCollection,
  collectionInfos.accountToPushSubscriptionCollection,
);
