import { aql } from 'arangojs';
import { query, literal } from '@openpeeps/arango-querybuilder';
import type { Scope, Webhook, WebhookData, WebhookEventType } from '@openpeeps/common/types';
import { allpeepDb, collectionInfos } from '../db';
import { webhooksMapping } from './mapping';

const webhooksCollectionName = collectionInfos.webhooksCollection.name;

export const registerWebhook = async (input: {
	serviceIdentityId: string;
	url: string;
	events: WebhookEventType[];
	scopes: Scope[];
}): Promise<Webhook> => {
	const { db } = await allpeepDb();

	const existing = await webhooksMapping.findOneBy(db, {
		matches: { serviceIdentityId: input.serviceIdentityId, url: input.url },
	});

	const now = new Date().toISOString();

	if (existing) {
		return webhooksMapping.update(db, existing.id, {
			events: input.events,
			scopes: input.scopes,
			disabled: false,
			consecutiveFailures: 0,
		});
	}

	return webhooksMapping.create(db, {
		serviceIdentityId: input.serviceIdentityId,
		url: input.url,
		events: input.events,
		scopes: input.scopes,
		disabled: false,
		consecutiveFailures: 0,
		createdAt: now,
		updatedAt: now,
	} as WebhookData & { id?: string });
};

export const deleteWebhook = async (webhookId: string): Promise<void> => {
	const { db } = await allpeepDb();
	await webhooksMapping.delete(db, webhookId);
};

export const deleteWebhooksByServiceIdentity = async (serviceIdentityId: string): Promise<number> => {
	const { db } = await allpeepDb();
	const removed = await query<Webhook>()
		.collection({ alias: 'w', collection: webhooksCollectionName })
		.filter(aql`w.serviceIdentityId == ${serviceIdentityId}`)
		.returnExpression(aql`REMOVE w IN ${literal(webhooksCollectionName)} RETURN OLD`)
		.all(db);
	return removed.length;
};

export const incrementWebhookFailures = async (webhookId: string): Promise<number> => {
	const { db } = await allpeepDb();
	const results = await query<number>()
		.collection({ alias: 'w', collection: webhooksCollectionName })
		.filter(aql`w._key == ${webhookId}`)
		.limit(1)
		.returnExpression(
			aql`UPDATE w WITH { consecutiveFailures: w.consecutiveFailures + 1 } IN ${literal(webhooksCollectionName)} RETURN NEW.consecutiveFailures`,
		)
		.all(db);
	return results[0] ?? 0;
};

export const disableWebhook = async (webhookId: string): Promise<void> => {
	const { db } = await allpeepDb();
	await webhooksMapping.update(db, webhookId, { disabled: true });
};

export const resetWebhookFailures = async (webhookId: string): Promise<void> => {
	const { db } = await allpeepDb();
	await webhooksMapping.update(db, webhookId, { consecutiveFailures: 0 });
};
