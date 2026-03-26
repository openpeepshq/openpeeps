import { client, payloadMutation, simpleStore } from '../helpers';

export const updateConfigMutation = payloadMutation(client.admin.config.update, {
	queryKeys: [['admin', 'config']]
});

export const configStore = (namespace: string, name: string) =>
	simpleStore(client.admin.config.read, {
		pathParams: { namespace, name }
	});

export const pinGlobally = payloadMutation(client.admin.posts.pinGlobally, {
	queryKeys: [['admin', 'config', 'allpeep', 'community'], ['server']]
});
