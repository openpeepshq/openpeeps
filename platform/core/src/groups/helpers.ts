import type {
  GroupRoleData,
  GroupWithMeta,
  ProfileWithMeta,
  PublicProfile,
} from '@openpeepshq/common/types';
import type { PgFilter } from '../db/pg/map/queryTypes';
import { checkRoleCapabilities, isLocal } from '@openpeepshq/common/lib';
import { connectionUpdater, connector, disconnector } from '../db/helpers';
import { collectionInfos } from '../db';
import { groupFilters } from '../db/pg/filters';

export const addMember = connector<PublicProfile, GroupWithMeta, GroupRoleData>(
  collectionInfos.profilesCollection,
  collectionInfos.groupsCollection,
  collectionInfos.userGroupsCollection,
);
export const removeMember = disconnector<PublicProfile, GroupWithMeta>(
  collectionInfos.profilesCollection,
  collectionInfos.groupsCollection,
  collectionInfos.userGroupsCollection,
);
export const updateMember = connectionUpdater<
  PublicProfile,
  GroupWithMeta,
  GroupRoleData
>(
  collectionInfos.profilesCollection,
  collectionInfos.groupsCollection,
  collectionInfos.userGroupsCollection,
);

const membershipIds = (profile?: ProfileWithMeta) =>
  profile?.memberships.map((membership) => membership.group.id) ?? [];

export const canSeeGroupFilter = (
  profile?: ProfileWithMeta,
): PgFilter<GroupWithMeta> | undefined => {
  if (
    checkRoleCapabilities(profile?.roles ?? [], ['core-groups-read']).success
  ) {
    return undefined;
  }
  // Limited members lack core-local but still belong to groups. Those
  // memberships stay visible; local-only groups stay hidden.
  if (!profile || !isLocal(profile)) {
    return groupFilters.readableByNonLocalProfile(membershipIds(profile));
  }
  return groupFilters.readableByLocalProfile(membershipIds(profile));
};
