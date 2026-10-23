import { isForbiddenHandle } from '@openpeepshq/common/types';
import { communityConfig } from '../config';
import { findProfileByHandle } from './finders';

export * from './mapping';
export * from './mutations';
export * from './finders';
export * from './export';
export {
  getProfileActivitySummary,
  getAdminProfileSummary,
} from './activitySummary';
export {
  getProfile,
  getPublicProfile,
  getProfiles,
  clearProfileCache,
} from './cache';
export {
  areBlocked,
  hasBlockAmong,
  loadBlockIds,
  listBlockingIds,
} from './blocks';

const sanitizeHandle = (name: string) => name.replace(/[^a-zA-Z0-9]/g, '-');

export const findNewFreeHandle = async (seed: string) => {
  let counter = 2;

  const sanitizedSeed = sanitizeHandle(seed).substring(0, 16);
  const community = await communityConfig();
  const additional = community.settings.additionalForbiddenHandles;

  let candidate = sanitizedSeed;

  while (
    isForbiddenHandle(candidate, additional) ||
    (await findProfileByHandle(candidate))
  ) {
    const counterString = String(counter);
    candidate =
      sanitizedSeed.substring(0, 16 - counterString.length) + counterString;
    counter++;
  }
  return candidate;
};
