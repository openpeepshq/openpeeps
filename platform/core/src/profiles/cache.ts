import { ProfileWithMeta } from '@openpeepshq/common/types';
import { createCache } from 'cache-manager';
import { allpeepDb } from '../db';
import { profilesMapping, publicProfilesMapping } from './mapping';

export const profilesCache = createCache({
  ttl: 60 * 60 * 1000,
  refreshThreshold: 60 * 1000,
});

const publicProfilesCache = createCache({
  ttl: 60 * 60 * 1000,
  refreshThreshold: 60 * 1000,
});

const withEmptyFollowGraphs = (profile: ProfileWithMeta): ProfileWithMeta => ({
  ...profile,
  roles: profile.roles ?? [],
  followers: [],
  following: [],
  controllers: profile.controllers ?? [],
  memberships: profile.memberships ?? [],
  profileStats: profile.profileStats ?? {
    followersCount: 0,
    followingCount: 0,
  },
});

export const getProfile = async (
  id: string,
  ignoreSoftDelete = false,
): Promise<ProfileWithMeta | undefined> =>
  profilesCache.wrap(id, () =>
    allpeepDb().then(({ db }) =>
      ignoreSoftDelete
        ? profilesMapping.ignoreSoftDelete().find(db, id)
        : profilesMapping.find(db, id),
    ),
  );

/** Lean profile for post/feed hydrate — no followers/following trees. */
export const getPublicProfile = async (
  id: string,
  ignoreSoftDelete = false,
): Promise<ProfileWithMeta | undefined> => {
  const profile = await publicProfilesCache.wrap(
    `${ignoreSoftDelete ? 'all:' : ''}${id}`,
    () =>
      allpeepDb().then(({ db }) =>
        ignoreSoftDelete
          ? publicProfilesMapping.ignoreSoftDelete().find(db, id)
          : publicProfilesMapping.find(db, id),
      ),
  );
  return profile ? withEmptyFollowGraphs(profile) : undefined;
};

export const getProfileByHandle = async (
  handle: string,
  ignoreSoftDelete = false,
): Promise<ProfileWithMeta | undefined> =>
  profilesCache.wrap(handle, () =>
    allpeepDb().then(({ db }) =>
      ignoreSoftDelete
        ? profilesMapping
            .ignoreSoftDelete()
            .findOneBy(db, { matches: { handle } })
        : profilesMapping.findOneBy(db, { matches: { handle } }),
    ),
  );

export const getProfiles = async (ids: string[]): Promise<ProfileWithMeta[]> =>
  profilesCache
    .mget<ProfileWithMeta>(ids)
    .then((profiles) =>
      Promise.all(
        profiles.map(async (p, index) => p || (await getProfile(ids[index]))),
      ),
    )
    .then((profiles) => profiles.filter((p) => !!p));
