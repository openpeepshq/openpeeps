import { createCache } from 'cache-manager';
import { jamState } from './livekit';
import { PostWithMeta } from '@openpeeps/common/types';

export const jamStateCache = createCache({
  ttl: 20 * 1000,
  refreshThreshold: 5 * 1000,
});

export const getJamState = async (jam: PostWithMeta) =>
  jamStateCache.wrap(jam.id, () => jamState(jam));
