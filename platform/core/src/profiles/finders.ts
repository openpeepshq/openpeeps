import {
  Account,
  GroupMember,
  GroupWithMeta,
  Profile,
  ProfileWithMeta,
  Role,
} from '@openpeeps/common/types';
import {
  accountProfileRelation,
  baseProfilesMapping,
  membersRelation,
  profileRoleRelation,
} from './mapping';
import { allpeepDb } from '../db';
import { profileFilters } from '../db/pg/filters';
import { rolesMapping } from '../roles/mapping';
import { findRolesByCapabilities } from '../roles/finders';
import { expandProfiles, followFinder } from './helpers';
import { accountsMapping } from '../accounts/mapping';
import { groupsMapping } from '../groups/mapping';
import { listGroups } from '../groups';
import { getProfile, getProfileByHandle } from './cache';

export const findProfile = (
  profileId: string,
): Promise<ProfileWithMeta | undefined> => getProfile(profileId);

export const findProfileByHandle = (
  handle: string,
): Promise<ProfileWithMeta | undefined> => getProfileByHandle(handle);
export const existsProfileByHandle = (handle: string) =>
  getProfileByHandle(handle, true).then(Boolean);

export const listProfiles = (): Promise<ProfileWithMeta[]> =>
  allpeepDb()
    .then(({ db }) =>
      baseProfilesMapping.filter(profileFilters.notGuest()).all(db),
    )
    .then(expandProfiles);

export const listProfilesByRole = (role: Role): Promise<ProfileWithMeta[]> =>
  allpeepDb()
    .then(({ db }) =>
      rolesMapping.relationsFrom(role, profileRoleRelation).all(db),
    )
    .then(expandProfiles);

export const listProfilesByAccount = (
  account: Account,
): Promise<ProfileWithMeta[]> =>
  allpeepDb()
    .then(({ db }) =>
      accountsMapping.relationsFrom(account, accountProfileRelation).all(db),
    )
    .then(expandProfiles);

export const listProfilesWithCapabilities = async (
  capabilities: string[],
): Promise<ProfileWithMeta[]> =>
  findRolesByCapabilities(capabilities)
    .then((roles) => Promise.all(roles.map((role) => listProfilesByRole(role))))
    .then((pp) => pp.flat());

export const follows = (
  follower: Profile,
  followed: Profile,
): Promise<boolean> =>
  allpeepDb().then(({ db }) =>
    followFinder(db, follower, followed).then(Boolean),
  );

export const listGroupMembers = (
  group: GroupWithMeta,
): Promise<GroupMember[]> =>
  allpeepDb()
    .then(({ db }) =>
      groupsMapping.relationsFrom(group, membersRelation).all(db),
    )
    .then((members) =>
      members.map(
        async (m): Promise<GroupMember> => ({
          ...m,
          profile: (await getProfile(m.profile.id))!,
        }),
      ),
    )
    .then((memberPromises) => Promise.all(memberPromises));

export const listCommonGroups = async (
  profile1: ProfileWithMeta,
  profile2: ProfileWithMeta,
): Promise<GroupWithMeta[]> => {
  const groups = await listGroups({ profile: profile1, scopes: [] });

  const profile1GroupIds = new Set(
    profile1.memberships?.map((m) => m.group.id) || [],
  );
  const profile2GroupIds = new Set(
    profile2.memberships?.map((m) => m.group.id) || [],
  );

  return groups.filter(
    (group) => profile1GroupIds.has(group.id) && profile2GroupIds.has(group.id),
  );
};
