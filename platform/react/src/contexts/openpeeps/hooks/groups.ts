import type { OpenpeepsClient } from '@openpeeps/client';
import { apiHook, payloadMutation, noPayloadMutation } from '../helpers';

export type GroupHooks = ReturnType<typeof groupHooks>;

export const groupHooks = (client: OpenpeepsClient) => ({
    createGroupAction: payloadMutation(client.groups.create, [['groups']]),
    useGroups: () => apiHook(client.groups.list),
    useGroup: (id: string) =>
        apiHook(client.groups.findById, { pathParams: { id } }),
    useGroupByHandle: (handle: string) =>
        apiHook(client.groups.findByHandle, { pathParams: { handle } }),
    updateGroupAction: payloadMutation(client.groups.update, [['groups']]),
    deleteGroupAction: noPayloadMutation(client.groups.delete, [['groups']]),
    useGroupMembers: (id: string) =>
        apiHook(client.groups.members, { pathParams: { id } }),
    joinGroupAction: noPayloadMutation(client.groups.join, [
        ['groups'],
        ['profiles', 'current'],
    ]),
    leaveGroupAction: noPayloadMutation(client.groups.leave, [
        ['groups'],
        ['profiles', 'current'],
    ]),
    addGroupMemberAction: payloadMutation(client.groups.addMember, [['groups']]),
    removeGroupMemberAction: noPayloadMutation(client.groups.removeMember, [
        ['groups'],
    ]),
    setGroupMemberRolesAction: payloadMutation(client.groups.setMemberRoles, [['groups']]),
}); 