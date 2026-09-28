import type { Hashtag, Profile } from '@openpeepshq/common/types';
import { allpeepDb } from '../db';
import { clearProfileCache } from '../profiles/cache';
import { profileHashtagConnector, profileHashtagDisconnector } from './helpers';

export const followHashtag = async (profile: Profile, hashtag: Hashtag) => {
  const { db } = await allpeepDb();
  await profileHashtagConnector(db, profile, hashtag);
  await clearProfileCache(profile);
};

export const unfollowHashtag = async (profile: Profile, hashtag: Hashtag) => {
  const { db } = await allpeepDb();
  await profileHashtagDisconnector(db, profile, hashtag);
  await clearProfileCache(profile);
};
