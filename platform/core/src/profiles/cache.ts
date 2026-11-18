import { Profile, ProfileWithMeta } from '@openpeepshq/common/types';
import { createCache } from 'cache-manager';
import { allpeepDb } from '../db';
import { config } from '../config';
import { profilesMapping, publicProfilesMapping } from './mapping';
import { loadBlockIds } from './blocks';

export const profilesCache = createCache({
  ttl: 60 * 60 * 1000,
  refreshThreshold: 60 * 1000,
});

export const publicProfilesCache = createCache({
  ttl: 60 * 60 * 1000,
  refreshThreshold: 60 * 1000,
});

export const clearProfileCache = async (
  profile: Pick<Profile, 'id' | 'handle'>,
): Promise<void> => {
  await Promise.all([
    profilesCache.del(profile.id),
    // `all:` keys back the ignore-soft-delete view (deactivated rows still
    // fetchable by id/handle after soft-delete).
    profilesCache.del(`all:${profile.id}`),
    profilesCache.del(profile.handle),
    profilesCache.del(`all:${profile.handle}`),
    publicProfilesCache.del(profile.id),
    publicProfilesCache.del(`all:${profile.id}`),
  ]);
};

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
  blockingIds: profile.blockingIds ?? [],
  blockedByIds: profile.blockedByIds ?? [],
});

const withBlockIds = async (
  profile: ProfileWithMeta | undefined,
): Promise<ProfileWithMeta | undefined> => {
  if (!profile) return undefined;
  const { db } = await allpeepDb();
  const { blockingIds, blockedByIds } = await loadBlockIds(db, profile.id);
  return { ...profile, blockingIds, blockedByIds };
};

export const getProfile = async (
  id: string,
  ignoreSoftDelete = false,
): Promise<ProfileWithMeta | undefined> =>
  // The ignore-soft-delete view is cached under a separate `all:` key so it
  // can never shadow the default (soft-delete-filtered) entry for the same id.
  profilesCache.wrap(`${ignoreSoftDelete ? 'all:' : ''}${id}`, () =>
    allpeepDb()
      .then(({ db }) =>
        ignoreSoftDelete
          ? profilesMapping.ignoreSoftDelete().find(db, id)
          : profilesMapping.find(db, id),
      )
      .then(withBlockIds),
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

/** Local handle lookup only — federated paths must use uri or (handle, domain). */
export const getProfileByHandle = async (
  handle: string,
  ignoreSoftDelete = false,
): Promise<ProfileWithMeta | undefined> =>
  // `all:` prefix separates the ignore-soft-delete view from the default
  // (soft-delete-filtered) entry, matching getProfile's keying.
  profilesCache.wrap(`${ignoreSoftDelete ? 'all:' : ''}${handle}`, () =>
    allpeepDb()
      .then(({ db }) =>
        ignoreSoftDelete
          ? profilesMapping
              .ignoreSoftDelete()
              .findOneBy(db, { matches: { handle } })
          : profilesMapping.findOneBy(db, { matches: { handle } }),
      )
      .then(withBlockIds),
  );

/** Local handle lookup scoped to the instance's default domain. */
export const getLocalProfileByHandle = async (
  handle: string,
): Promise<ProfileWithMeta | undefined> => {
  const { activityPub } = await config();
  return allpeepDb()
    .then(({ db }) =>
      profilesMapping.findOneBy(db, {
        matches: {
          handle,
          type: 'local',
          activityPub: { domain: activityPub.defaultDomain },
        },
      }),
    )
    .then(withBlockIds);
};

export const getProfiles = async (
  ids: string[],
  ignoreSoftDelete = false,
): Promise<ProfileWithMeta[]> =>
  profilesCache
    .mget<ProfileWithMeta>(
      ignoreSoftDelete ? ids.map((id) => `all:${id}`) : ids,
    )
    .then((profiles) =>
      Promise.all(
        profiles.map(
          async (p, index) =>
            p || (await getProfile(ids[index], ignoreSoftDelete)),
        ),
      ),
    )
    .then((profiles) => profiles.filter((p) => !!p));
