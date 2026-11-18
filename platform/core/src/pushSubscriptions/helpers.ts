import { Account, PushSubscription } from '@openpeepshq/common/types';
import { connector, disconnector } from '../db/helpers';
import { collectionInfos } from '../db';

export const pushSubscriptionAccountConnector = connector<
  Account,
  PushSubscription
>(
  collectionInfos.accountsCollection,
  collectionInfos.pushSubscriptionsCollection,
  collectionInfos.accountToPushSubscriptionCollection,
);

export const pushSubscriptionAccountDisconnector = disconnector<
  Account,
  PushSubscription
>(
  collectionInfos.accountsCollection,
  collectionInfos.pushSubscriptionsCollection,
  collectionInfos.accountToPushSubscriptionCollection,
);
