import { communityConfigFresh } from '../config';
import { logger } from '../log';
import { hub } from '../events';
import { getProfile } from './cache';
import { followDesignatedProfiles } from './mutations';

const log = logger('app:profiles:autoFollow');

const handleProfileCreated = async (profileArg: unknown) => {
  const profile = profileArg as { id?: string } | undefined;
  if (!profile?.id) return;
  // Event payload predates applyCommunityRoleChanges; re-read for final
  // roles (and to skip profiles deleted before the job runs)
  const fresh = await getProfile(profile.id);
  if (!fresh) return;
  // Read the community config fresh from the DB rather than through the
  // in-memory cache: this handler runs in the worker process, whose cache is
  // only refreshed on a redis pub/sub `configUpdated` event that a worker
  // connection can miss. A stale cache left empty/old `content.autoFollow`
  // would silently skip the designated follows after an admin saved them.
  try {
    const autoFollow = (await communityConfigFresh()).content.autoFollow;
    if (!autoFollow?.length) return;
    await followDesignatedProfiles(fresh, autoFollow);
  } catch (error) {
    // Re-throw so the once-queue job fails; it stays retained for diagnosis
    // (30-day removeOnFail age) with its failedReason — the queue sets no
    // attempts, so no retry is scheduled. The worker's last-five-errors table
    // prints only the raw failedReason (no profile id), so the handler-level
    // log line is what makes the failed profile identifiable.
    log.error(`auto-follow handler failed for profile ${profile.id}`, error);
    throw error;
  }
};

let registered = false;
/** Subscribes the designated-account follows to profileCreated (once queue). */
export const registerAutoFollowHandler = () => {
  if (registered) return;
  registered = true;
  hub.once('profileCreated', handleProfileCreated);
};

/**
 * Test-only: clear the module-local registration flag so a fresh
 * `registerAutoFollowHandler()` call re-subscribes. Without it, the
 * once-per-process guard makes the handler un-reachable from a second test
 * file (and the already-registered subscription is never re-created).
 */
export const resetAutoFollowHandlerRegistration = () => {
  registered = false;
};
