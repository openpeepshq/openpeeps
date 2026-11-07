import {
  FollowData,
  Profile,
  ProfileWithMeta,
  Role,
} from '@openpeepshq/common/types';
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

const roleConnector = connector<Profile, Role>(
  collectionInfos.profilesCollection,
  collectionInfos.rolesCollection,
  collectionInfos.hasRoleCollection,
);

export const roleFinder = connectionFinder<Profile, Role>(
  collectionInfos.profilesCollection,
  collectionInfos.rolesCollection,
  collectionInfos.hasRoleCollection,
);

// Idempotent: assigning a role the profile already holds must not create a
// duplicate edge (signup, email validation and login all assign defaults).
export const roleAssigner = async (
  db: Parameters<typeof roleConnector>[0],
  profile: Profile,
  role: Role,
) => {
  const existing = await roleFinder(db, profile, role);
  if (existing) return existing;
  return roleConnector(db, profile, role);
};

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
