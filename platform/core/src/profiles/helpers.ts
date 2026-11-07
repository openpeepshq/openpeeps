import {
  FollowData,
  Profile,
  ProfileWithMeta,
  Role,
} from '@openpeepshq/common/types';
import { uuidv7 } from 'uuidv7';
import { connectionFinder, connector, disconnector } from '../db/helpers';
import { collectionInfos } from '../db';
import type { PgDb } from '../db/pg/client';
import { nowIso } from '../db/pg/mappers';
import { hasRole } from '../db/pg/schema';
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

// Idempotent and race-safe: a role the profile already holds is a no-op, and
// concurrent assigns (parallel first logins, login racing email validation)
// insert against has_role_from_to_unique instead of one failing with a
// unique violation.
export const roleAssigner = async (db: PgDb, profile: Profile, role: Role) => {
  const ts = nowIso();
  await db
    .insert(hasRole)
    .values({
      id: uuidv7(),
      fromId: profile.id,
      toId: role.id,
      body: {},
      createdAt: ts,
      updatedAt: ts,
    })
    .onConflictDoNothing();
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
