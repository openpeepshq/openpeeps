import type {
  GroupRoleData,
  GroupWithMeta,
  ProfileWithMeta,
  PublicProfile,
} from '@openpeeps/common/types';
import { OMFilterList, OMFilter } from '@openpeeps/arango-querybuilder';
import { isLocal } from '@openpeeps/common/lib';
import { connectionUpdater, connector, disconnector } from '../db/helpers';
import { collectionInfos } from '../db/structure';

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
): OMFilter<GroupWithMeta> => {
  if (!profile || !isLocal(profile)) {
    return `ALLPEEP::CHECK_CAPABILITIES(['core-groups-read'], DOC.capabilities['none'] || {} ).success`;
  }
  return {
    operator: '||',
    predicates: [
      `ALLPEEP::CHECK_CAPABILITIES(['core-groups-read'],ALLPEEP::MERGE_CAPABILITIES([DOC.capabilities['none'], DOC.capabilities.local])).success`,
      `DOC._key IN [${profile.memberships.map((m) => `"${m.group.id}"`).join(',')}]`,
    ],
  } as OMFilterList<GroupWithMeta>;
};
