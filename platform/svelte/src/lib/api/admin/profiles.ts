import { client, noPayloadMutation, payloadMutation, simpleStore } from '../helpers';

export const deleteProfileMutation = noPayloadMutation(client.admin.profiles.delete, {
	queryKeys: [['admin', 'profiles']]
});

export const modifyProfileRolesMutation = payloadMutation(client.admin.profiles.updateRoles, {
	queryKeys: [['admin', 'profiles']]
});

export const getProfileRoles = (id: string) =>
	simpleStore(client.admin.profiles.listRoles, { pathParams: { id } });

export const adminProfilesStore = () => simpleStore(client.admin.profiles.list);
