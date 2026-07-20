import {
  AccessTokenData,
  AccountWithMeta,
  ProfileWithMeta,
} from '@openpeeps/common/types';
import { allpeepDb } from '../db';
import {
  profileAccessTokenConnector,
  removeEdgesForAccessToken,
} from './helpers';
import { accessTokensMapping } from './mapping';
import { uuidv7 } from 'uuidv7';
import { addToBloomFilter } from './revokations';

export const createAccessToken = (
  profile: ProfileWithMeta | undefined,
  data: AccessTokenData,
) =>
  allpeepDb().then(async ({ db }) => {
    const id = uuidv7();
    const accessToken = await accessTokensMapping.create(db, { ...data, id });
    if (profile) {
      await profileAccessTokenConnector(db, profile, accessToken);
    }
    return accessToken;
  });

export const deleteAccessToken = (id: string) =>
  allpeepDb().then(async ({ db }) => {
    await removeEdgesForAccessToken(db, id);
    return accessTokensMapping.delete(db, id);
  });

export const revokeAccessToken = (id: string) =>
  allpeepDb().then(async ({ db }) => {
    const accessToken = await accessTokensMapping.update(db, id, {
      revokedAt: new Date().toISOString(),
    });
    addToBloomFilter(id);
    return accessToken;
  });
