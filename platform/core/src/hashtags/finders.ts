import { normalizeHashtagTag } from '@openpeepshq/common/types';
import type { Hashtag, ProfileWithMeta } from '@openpeepshq/common/types';

import { allpeepDb } from '../db';
import { hashtagsMapping } from './mapping';

export const findHashtag = async (id: string) => {
  const { db } = await allpeepDb();
  return hashtagsMapping.find(db, id);
};

export const findHashtagByTag = async (tag: string) => {
  const { db } = await allpeepDb();
  return hashtagsMapping.findOneBy(db, {
    matches: { tag: normalizeHashtagTag(tag) },
  });
};

export const findOrCreateHashtag = async (tag: string) => {
  const { db } = await allpeepDb();
  const normalizedTag = normalizeHashtagTag(tag);

  const hashtag = await findHashtagByTag(normalizedTag);

  if (hashtag) {
    return hashtag;
  }

  return hashtagsMapping.create(db, { tag: normalizedTag });
};

export const listFollowedHashtags = (profile: ProfileWithMeta) =>
  profile.followedHashtags ?? [];

export const isFollowingHashtag = (
  profile: ProfileWithMeta,
  hashtag: Pick<Hashtag, 'id'>,
) => profile.followedHashtags?.some((h) => h.id === hashtag.id) ?? false;
