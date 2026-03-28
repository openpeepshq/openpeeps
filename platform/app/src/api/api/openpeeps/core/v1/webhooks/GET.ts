import { Endpoint } from 'sveltekit-api';
import type { RequestEvent } from '@sveltejs/kit';
import { listWebhooksResponseSchema } from '@openpeeps/common/types';
import { authNeeded, forbidden } from '$lib/server/api/errors';
import { ensureServiceScope } from '$lib/server/auth';
import { getWebhooksByServiceIdentity } from '@openpeeps/core/webhooks';

export const Output = listWebhooksResponseSchema;

export const Error = { 401: authNeeded(), 403: forbidden() };

export default new Endpoint({ Output, Error }).handle(
	async (_, event: RequestEvent) => {
		await ensureServiceScope(event, 'read', { type: 'webhooks', id: '*' });

		const serviceId = event.locals.authorization.identities.find(i => i.type === 'service')?.id;
		if (!serviceId) throw forbidden('Service identity required');

		const webhooks = await getWebhooksByServiceIdentity(serviceId);
		return webhooks.map(w => ({
			id: w.id,
			url: w.url,
			events: w.events,
			disabled: w.disabled,
			consecutiveFailures: w.consecutiveFailures,
			createdAt: w.createdAt,
		}));
	},
);
