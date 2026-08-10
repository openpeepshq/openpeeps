import { createCache } from 'cache-manager';
import { jamState } from './livekit';
import { PostWithMeta } from '@openpeepshq/common/types';

export const jamStateCache = createCache({
  ttl: 20 * 1000,
  refreshThreshold: 5 * 1000,
});

export const getJamState = async (jam: PostWithMeta) =>
  jamStateCache.wrap(jam.id, () => jamState(jam));

/** Caches the LiveKit scan for live jam posts (before auth filtering). */
export const LIVE_JAMS_CACHE_KEY = 'live-jams';
export const liveJamPostsCache = createCache({
  ttl: 10 * 1000,
  refreshThreshold: 3 * 1000,
});
