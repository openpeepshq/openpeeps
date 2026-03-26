import { Account, PushSubscription } from "@openpeeps/common/types";
import { connector } from "../db/helpers";
import { collectionInfos } from "../db/structure";

export const pushSubscriptionAccountConnector = connector<Account, PushSubscription>(
    collectionInfos.accountsCollection,
    collectionInfos.pushSubscriptionsCollection,
    collectionInfos.accountToPushSubscriptionCollection,
);