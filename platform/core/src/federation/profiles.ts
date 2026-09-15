import { allpeepDb } from '../db';
import { profilesMapping } from '../profiles/mapping';
import type { ProfileWithMeta } from '@openpeepshq/common/types';

export const findProfileByUri = async (
  uri: string,
): Promise<ProfileWithMeta | undefined> => {
  const { db } = await allpeepDb();
  return profilesMapping.findOneBy(db, {
    matches: { uri },
  });
};

export const findProfileByHandleAndDomain = async (
  handle: string,
  domain: string,
): Promise<ProfileWithMeta | undefined> => {
  const { db } = await allpeepDb();
  return profilesMapping.findOneBy(db, {
    matches: { handle, activityPub: { domain } },
  });
};
