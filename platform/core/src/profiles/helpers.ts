import {
  FollowData,
  Profile,
  ProfileWithMeta,
  Role,
} from '@openpeeps/common/types';
import { connectionFinder, connector, disconnector } from '../db/helpers';
import { collectionInfos } from '../db';
import { getProfiles } from './cache';

export const followConnector = connector<Profile, Profile, FollowData>(
  collectionInfos.profilesCollection,
  collectionInfos.profilesCollection,
  collectionInfos.followsCollection,
);
export const followDisconnector = disconnector<Profile, Profile>(
  collectionInfos.profilesCollection,
  collectionInfos.profilesCollection,
  collectionInfos.followsCollection,
);
export const followFinder = connectionFinder<Profile, Profile>(
  collectionInfos.profilesCollection,
  collectionInfos.profilesCollection,
  collectionInfos.followsCollection,
);

export const expandProfiles = (
  profiles: Profile[],
): Promise<ProfileWithMeta[]> => getProfiles(profiles.map((p) => p.id));

export const roleAssigner = connector<Profile, Role>(
  collectionInfos.profilesCollection,
  collectionInfos.rolesCollection,
  collectionInfos.hasRoleCollection,
);

export const roleUnassigner = disconnector<Profile, Role>(
  collectionInfos.profilesCollection,
  collectionInfos.rolesCollection,
  collectionInfos.hasRoleCollection,
);

export const giveControl = connector(
  collectionInfos.accountsCollection,
  collectionInfos.profilesCollection,
  collectionInfos.controlsCollection,
);
