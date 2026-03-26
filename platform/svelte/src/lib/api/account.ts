import { client, noPayloadMutation, payloadMutation, simpleStore } from './helpers';
import { getCredentials } from '$lib/auth';

export const updateCurrentAccountMutation = payloadMutation(client.accounts.current.update, {
	queryKeys: [['account', 'current']]
});

export const currentAccountStore = () => simpleStore(client.accounts.current.read, {
	preQueryCheck: () => {
		if (!getCredentials().token) {
			throw { success: false, message: "No credentials found." };
		}
	},
});

export const createPushSubscription = payloadMutation(
	client.accounts.current.createPushSubscription
);

export const testPushSubscription = payloadMutation(
	client.accounts.current.testPushSubscription
);

export const validateEmailAction = noPayloadMutation(
	client.accounts.current.validationEmail
);
