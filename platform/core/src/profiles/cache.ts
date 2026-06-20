import { ProfileWithMeta } from '@openpeeps/common/types';
import { createCache } from 'cache-manager';
import { allpeepDb } from '../db';
import { profilesMapping } from './mapping';

export const profilesCache = createCache({
  ttl: 60 * 60 * 1000,
  refreshThreshold: 60 * 1000,
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
