import { Endpoint, z } from 'sveltekit-api';
import type { RequestEvent } from '@sveltejs/kit';
import {
	successResponseSchema,
} from '@openpeeps/common/types';
import { authNeeded, forbidden, notFound } from '$lib/server/api/errors';
import { ensureServiceScope } from '$lib/server/auth';
import { getWebhookById, deleteWebhook } from '@openpeeps/core/webhooks';

export const Param = z.object({ id: z.string() });
export const Output = successResponseSchema;
export const Error = { 401: authNeeded(), 403: forbidden(), 404: notFound() };

export default new Endpoint({ Param, Output, Error }).handle(
	async (params, event: RequestEvent) => {
		await ensureServiceScope(event, 'write', { type: 'webhooks', id: '*' });

		const serviceId = event.locals.authorization.identities.find(i => i.type === 'service')?.id;
		if (!serviceId) throw forbidden('Service identity required');

		const webhook = await getWebhookById(params.id);
		if (!webhook) throw notFound('Webhook not found');

		if (webhook.serviceIdentityId !== serviceId) throw forbidden('Webhook does not belong to this service identity');

		await deleteWebhook(params.id);
		return { success: true };
	},
);
