import type { OpenpeepsClient } from '@openpeeps/client';
import { apiHook, payloadMutation, noPayloadMutation } from '../helpers';

export type GroupHooks = ReturnType<typeof groupHooks>;

export const groupHooks = (client: OpenpeepsClient) => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createGroupAction: payloadMutation(client.groups.create as any, [['groups']]),
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addGroupMemberAction: payloadMutation(client.groups.addMember as any, [
    ['groups'],
  ]),
  removeGroupMemberAction: noPayloadMutation(client.groups.removeMember, [
    ['groups'],
  ]),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setGroupMemberRolesAction: payloadMutation(
    client.groups.setMemberRoles as any,
    [['groups']],
  ),
});
