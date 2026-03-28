import { map } from '@openpeeps/arango-querybuilder';
import type { Webhook, WebhookData } from '@openpeeps/common/types';
import { collectionInfos } from '../db/structure';

export const webhooksMapping = map<WebhookData, Webhook>({
	collection: collectionInfos.webhooksCollection.name,
	softDelete: false,
	keepMetadata: true,
});
