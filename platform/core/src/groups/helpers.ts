import type {
  GroupRoleData,
  GroupWithMeta,
  ProfileWithMeta,
  PublicProfile,
} from '@openpeeps/common/types';
import type { PgFilter } from '../db/pg/map/queryTypes';
import { checkRoleCapabilities, isLocal } from '@openpeeps/common/lib';
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

export const canSeeGroupFilter = (
  profile?: ProfileWithMeta,
): PgFilter<GroupWithMeta> | undefined => {
  if (
    checkRoleCapabilities(profile?.roles ?? [], ['core-groups-read']).success
  ) {
    return undefined;
  }
  if (!profile || !isLocal(profile)) {
    return groupFilters.publiclyReadable();
  }
  return groupFilters.readableByLocalProfile(
    profile.memberships.map((m) => m.group.id),
  );
};
