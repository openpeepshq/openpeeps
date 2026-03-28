import { Endpoint } from 'sveltekit-api';
import type { RequestEvent } from '@sveltejs/kit';
import {
	createWebhookRequestSchema,
	createWebhookResponseSchema,
} from '@openpeeps/common/types';
import { authNeeded, forbidden } from '$lib/server/api/errors';
import { ensureServiceScope } from '$lib/server/auth';
import { registerWebhook, validateWebhookUrl } from '@openpeeps/core/webhooks';

export const Input = createWebhookRequestSchema;
export const Output = createWebhookResponseSchema;

export const Error = { 401: authNeeded(), 403: forbidden() };

export default new Endpoint({ Input, Output, Error }).handle(
	async (input, event: RequestEvent) => {
		await ensureServiceScope(event, 'write', { type: 'webhooks', id: '*' });

		validateWebhookUrl(input.url);

		const serviceId = event.locals.authorization.identities.find(i => i.type === 'service')?.id;
		if (!serviceId) throw forbidden('Service identity required');

		const webhook = await registerWebhook({
			serviceIdentityId: serviceId,
			url: input.url,
			events: input.events,
			scopes: event.locals.authorization.scopes,
		});

		return {
			id: webhook.id,
			url: webhook.url,
			events: webhook.events,
			createdAt: webhook.createdAt,
		};
	},
);
