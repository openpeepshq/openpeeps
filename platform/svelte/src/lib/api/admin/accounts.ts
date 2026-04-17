import { client, noPayloadMutation, payloadMutation, simpleStore } from '../helpers';

export const accountsStore = () => simpleStore(client.admin.accounts.list);

export const accountByIdStore = (id: string) =>
	simpleStore(client.admin.accounts.findById, { pathParams: { id } });

export const accountProfilesStore = (id: string) =>
	simpleStore(client.admin.profiles.listByAccount, { pathParams: { id: id } });

export const deleteAccountMutation = noPayloadMutation(client.admin.accounts.delete, {
	queryKeys: [['admin', 'accounts']]
});

export const updateAccountMutation = payloadMutation(client.admin.accounts.update, {
	queryKeys: [['admin', 'accounts']]
});
