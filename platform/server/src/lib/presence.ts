import { checkRoleCapabilities } from '@openpeepshq/common/lib';
import type { ProfileWithMeta, PublicProfile } from '@openpeepshq/common/types';
import { getSharedConnection } from '@openpeepshq/core/redis';

/**
 * Presence key TTL in seconds. A profile counts as online for this long
 * after its last heartbeat; the TTL replaces the old in-process sweep.
 */
const PRESENCE_TTL_SECONDS = 120;

const presenceKey = (profileId: string) => `presence:${profileId}`;

// Presence is ephemeral and best-effort: the TTL handles staleness, and a
// down Redis must not break profile reads or heartbeat callers.
export const markProfileSeen = async (profileId: string): Promise<void> => {
  try {
    const redis = await getSharedConnection();
    await redis.set(presenceKey(profileId), '1', {
      EX: PRESENCE_TTL_SECONDS,
    });
  } catch {
    // Non-fatal: the client ignores heartbeat failures and the next tick
    // retries.
  }
};

export const isProfileOnline = async (profileId: string): Promise<boolean> => {
  try {
    const redis = await getSharedConnection();
    return (await redis.exists(presenceKey(profileId))) === 1;
  } catch {
    return false;
  }
};

const canSeePresence = (roles: ProfileWithMeta['roles']) =>
  checkRoleCapabilities(roles, ['core-presence-read']).success;

/**
 * Attaches `online` to profiles whose presence the viewer may see. Both the
 * viewer and the target need the `core-presence-read` capability (owner via
 * `*`, admin and moderator by default); everyone else gets no presence data.
 */
export const withPresenceForViewer = async (
  viewer: ProfileWithMeta | undefined,
  target: ProfileWithMeta,
  profile: PublicProfile,
): Promise<PublicProfile> => {
  if (!viewer || viewer.id === target.id) return profile;
  if (!canSeePresence(viewer.roles) || !canSeePresence(target.roles)) {
    return profile;
  }
  return { ...profile, online: await isProfileOnline(target.id) };
};
