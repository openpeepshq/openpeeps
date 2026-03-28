import type { Webhook } from '@openpeeps/common/types';
import { allpeepDb } from '../db';
import { webhooksMapping } from './mapping';

export const getWebhooksByEvent = async (eventType: string): Promise<Webhook[]> => {
	const { db } = await allpeepDb();
	return webhooksMapping
		.filter({
			operator: '&&',
			predicates: [`${eventType} IN DOC.events`, `DOC.disabled != true`],
		})
		.all(db);
};

export const getWebhooksByServiceIdentity = async (serviceIdentityId: string): Promise<Webhook[]> => {
	const { db } = await allpeepDb();
	return webhooksMapping.filter({ matches: { serviceIdentityId } }).all(db);
};

export const getWebhookById = async (webhookId: string): Promise<Webhook | null> => {
	const { db } = await allpeepDb();
	const doc = await webhooksMapping.find(db, webhookId);
	return doc ?? null;
};
