import { allpeepDb } from '../db';
import { Profile } from '@openpeepshq/common/types';
import { findProfileByHandle } from './finders';

export * from './mapping';
export * from './mutations';
export * from './finders';
export * from './export';
export { getProfile, getPublicProfile, getProfiles } from './cache';

const sanitizeHandle = (name: string) => name.replace(/[^a-zA-Z0-9]/g, '-');

export const findNewFreeHandle = async (seed: string) => {
  let counter = 2;

  const sanitizedSeed = sanitizeHandle(seed).substring(0, 16);

  let candidate = sanitizedSeed;

  while (await findProfileByHandle(candidate)) {
    const counterString = String(counter);
    candidate =
      sanitizedSeed.substring(0, 16 - counterString.length) + counterString;
    counter++;
  }
  return candidate;
};
