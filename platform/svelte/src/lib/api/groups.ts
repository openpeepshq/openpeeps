import { payloadMutation, noPayloadMutation, simpleStore, client } from './helpers';

export const groupsStore = () => simpleStore(client.groups.list);

export const groupStore = (id: string) =>
	simpleStore(client.groups.findById, { pathParams: { id } });

export const groupByHandleStore = (handle: string) =>
	simpleStore(client.groups.findByHandle, { pathParams: { handle: handle } });

export const groupMembersStore = (id: string) =>
	simpleStore(client.groups.members, { pathParams: { id } });

export const updateGroupMutation = payloadMutation(client.groups.update, {
	queryKeys: [['groups']]
});

export const createGroupMutation = payloadMutation(client.groups.create, {
	queryKeys: [['groups'], ['profiles', 'current']]
});

export const deleteGroupMutation = noPayloadMutation(client.groups.delete, {
	queryKeys: [['groups']]
});

export const joinGroupMutation = noPayloadMutation(client.groups.join, {
	queryKeys: [['groups'], ['profiles', 'current']]
});

export const leaveGroupMutation = noPayloadMutation(client.groups.leave, {
	queryKeys: [['groups'], ['profiles', 'current']]
});

export const addMemberMutation = payloadMutation(client.groups.addMember, {
	queryKeys: [['groups']]
});

export const removeMemberMutation = noPayloadMutation(client.groups.removeMember, {
	method: 'delete',
	queryKeys: [['groups']]
});

export const setMemberRolesMutation = payloadMutation(client.groups.setMemberRoles, {
	method: 'put',
	queryKeys: [['groups']]
});

export const exitMutation = noPayloadMutation(client.groups.leave, {
	method: 'delete',
	queryKeys: [['groups']]
});
