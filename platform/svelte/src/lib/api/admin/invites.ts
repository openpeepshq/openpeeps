import { client, noPayloadMutation, payloadMutation, simpleStore } from '../helpers';
export const getInvitesListStore = () => simpleStore(client.admin.invites.list);

export const createInviteMutation = payloadMutation(client.admin.invites.create, {
	queryKeys: [['invite-links']]
});

export const activateInviteLinkMutation = noPayloadMutation(client.admin.invites.activate, {
	queryKeys: [['invite-links']]
});

export const deactivateInviteLinkMutation = noPayloadMutation(client.admin.invites.deactivate, {
	queryKeys: [['invite-links']]
});
