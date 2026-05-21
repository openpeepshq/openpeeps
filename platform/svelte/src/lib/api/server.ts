import { client, payloadMutation, simpleStore } from './helpers';

export const serverInfoStore = () => simpleStore(client.server.info);
export const webhookSigningKeyStore = () => simpleStore(client.server.keys.webhooks.public);
export const verifyWebhookTokenMutation = payloadMutation(client.server.keys.webhooks.verify);
