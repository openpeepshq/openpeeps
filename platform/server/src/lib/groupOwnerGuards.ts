import {
  actorIsGroupOwner,
  countGroupOwners,
  groupOwnerRemovalBlocked,
  groupRoleChangeBlocked,
  type GroupRoleChangeBlock,
} from '@openpeepshq/common/lib';
import type {
  GroupMember,
  GroupRelationship,
  GroupWithMeta,
  ProfileWithMeta,
} from '@openpeepshq/common/types';
import { listGroupMembers } from '@openpeepshq/core/profiles';
import { conflict, forbidden } from './errors';

const rolesForMember = (
  members: GroupMember[],
  profile: ProfileWithMeta,
  groupId: string,
) =>
  members.find((member) => member.profile.id === profile.id)?.roles ??
  profile.memberships?.find((membership) => membership.group.id === groupId)
    ?.roles;

export const ensureGroupRoleChangeAllowed = async (
  actor: ProfileWithMeta,
  group: GroupWithMeta,
  target: ProfileWithMeta,
  nextRoles: GroupRelationship[] | null | undefined,
) => {
  const members = await listGroupMembers(group);
  const blocked: GroupRoleChangeBlock | undefined = groupRoleChangeBlocked({
    actorIsOwner: actorIsGroupOwner(actor, group.id),
    currentRoles: rolesForMember(members, target, group.id),
    nextRoles: nextRoles ?? [],
    ownerCount: countGroupOwners(members),
  });
  if (blocked === 'last-owner') {
    throw conflict('groups.leave.lastOwnerError');
  }
  if (blocked === 'owner-assignment') {
    throw forbidden('groups.changeRoles.ownerForbidden');
  }
};

export const ensureGroupOwnerRemovable = async (
  group: GroupWithMeta,
  target: ProfileWithMeta,
) => {
  const members = await listGroupMembers(group);
  if (
    groupOwnerRemovalBlocked({
      targetRoles: rolesForMember(members, target, group.id),
      ownerCount: countGroupOwners(members),
    })
  ) {
    throw conflict('groups.leave.lastOwnerError');
  }
};
