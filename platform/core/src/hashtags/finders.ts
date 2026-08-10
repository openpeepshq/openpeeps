import { normalizeHashtagTag } from '@openpeepshq/common/types';

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
