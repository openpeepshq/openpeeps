import { hub } from '../events';
import { getWebhooksByEvent } from './finders';
import { enqueueWebhookDelivery } from './delivery';
import { logger } from '../log';
import type { Scope, WebhookEventType } from '@openpeeps/common/types';

const log = logger('openpeeps:webhooks:handlers');

export const webhookScopeCovers = (scopes: Scope[], resourceType: string, scope: string): boolean =>
	scopes.some(
		(s) =>
			s.resource.type === resourceType &&
			s.resource.id === '*' &&
			(s.scope === scope || s.scope === 'admin'),
	);

export const shouldDeliverToWebhook = (
	scopes: Scope[],
	eventType: string,
	payload: Record<string, unknown>,
): boolean => {
	if (eventType === 'postCreated') {
		const post = payload as { visibility?: string };
		const isDM = post.visibility === 'direct';
		const isPrivate = post.visibility === 'private';
		if (webhookScopeCovers(scopes, 'posts', 'admin')) return true;
		if (isDM || isPrivate) return false;
		return webhookScopeCovers(scopes, 'posts', 'read') || webhookScopeCovers(scopes, 'posts', 'write');
	}

	if (eventType === 'jamRecordingCompleted') {
		return webhookScopeCovers(scopes, 'jam', 'admin') || webhookScopeCovers(scopes, 'jam', 'read');
	}

	return false;
};

export const registerWebhookHandlers = () => {
	const eventTypes: WebhookEventType[] = [
		'postCreated',
		'jamRecordingCompleted',
	];

	for (const eventType of eventTypes) {
		hub.on(eventType, async (...args: unknown[]) => {
			const payload = (args[0] ?? {}) as Record<string, unknown>;

			try {
				const webhooks = await getWebhooksByEvent(eventType);

				for (const webhook of webhooks) {
					const allowed = shouldDeliverToWebhook(webhook.scopes ?? [], eventType, payload);
					if (!allowed) continue;

					await enqueueWebhookDelivery({
						webhookId: webhook.id,
						webhookUrl: webhook.url,
						eventType,
						payload,
					});
				}
			} catch (err) {
				log.error('Failed to process webhook event', { eventType, err });
			}
		});
	}

	log.info('Webhook handlers registered for all event types');
};
