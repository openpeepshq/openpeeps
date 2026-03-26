import { PushSubscription, PushSubscriptionData } from "@openpeeps/common/types";
import { map } from "@openpeeps/arango-querybuilder";
import { collectionInfos } from "../db/structure";

export const pushSubscriptionsMapping = map<PushSubscriptionData, PushSubscription>({
    collection: collectionInfos.pushSubscriptionsCollection.name,
    softDelete: false,
});