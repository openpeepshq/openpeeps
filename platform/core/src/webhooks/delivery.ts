import { createHash } from 'crypto';
import { queueAndWorker } from '../jobs';
import { logger } from '../log';
import {
	incrementWebhookFailures,
	resetWebhookFailures,
	disableWebhook,
} from './mutations';

const log = logger('openpeeps:webhooks:delivery');

const CIRCUIT_BREAKER_THRESHOLD = 10;

export interface WebhookDeliveryJob {
	webhookId: string;
	webhookUrl: string;
	eventType: string;
	payload: Record<string, unknown>;
}

const [webhookQueue, webhookWorker] = queueAndWorker<WebhookDeliveryJob>(
	'webhook-delivery',
	async (job) => {
		const { webhookId, webhookUrl, eventType, payload } = job.data;

		const response = await fetch(webhookUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ event: eventType, data: payload, timestamp: new Date().toISOString() }),
			signal: AbortSignal.timeout(10_000),
		});

		if (!response.ok) {
			const failures = await incrementWebhookFailures(webhookId);
			if (failures >= CIRCUIT_BREAKER_THRESHOLD) {
				await disableWebhook(webhookId);
				log.warn('Webhook disabled by circuit breaker', { webhookId, failures });
			}
			throw new Error(`Webhook delivery failed: ${response.status} ${response.statusText}`);
		}

		// Success — reset failure counter
		await resetWebhookFailures(webhookId);
		log.info('Webhook delivered', { webhookId, eventType });
	},
	{
		defaultJobOptions: {
			attempts: 3,
			backoff: { type: 'exponential', delay: 1000 },
			removeOnComplete: { age: 3600 },
			removeOnFail: { age: 2592000 },
		},
	},
);

export const enqueueWebhookDelivery = async (job: WebhookDeliveryJob): Promise<void> => {
	const payloadHash = createHash('sha256')
		.update(JSON.stringify(job.payload))
		.digest('hex')
		.slice(0, 12);
	const jobId = `${job.eventType}:${payloadHash}:${job.webhookId}`;

	await webhookQueue().add(job.eventType, job, { jobId });
};

export { webhookQueue, webhookWorker };
