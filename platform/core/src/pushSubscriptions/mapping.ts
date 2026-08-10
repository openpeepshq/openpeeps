import {
  PushSubscription,
  PushSubscriptionData,
} from '@openpeepshq/common/types';
import { map } from '../db/pg/map';
import { collectionInfos } from '../db';

export const pushSubscriptionsMapping = map<
  PushSubscriptionData,
  PushSubscription
>({
  collection: collectionInfos.pushSubscriptionsCollection.name,
  softDelete: false,
});
