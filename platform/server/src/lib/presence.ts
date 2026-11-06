import { checkRoleCapabilities } from '@openpeepshq/common/lib';
import type { ProfileWithMeta, PublicProfile } from '@openpeepshq/common/types';

/** A profile counts as online for this long after its last heartbeat. */
const ONLINE_WINDOW_MS = 2 * 60 * 1000;

// Process-local presence registry. Presence is ephemeral by design: it is
// lost on restart and intentionally not persisted.
const seenAt = new Map<string, number>();

export const markProfileSeen = (profileId: string) => {
  const now = Date.now();
  for (const [id, seen] of seenAt) {
    if (now - seen > ONLINE_WINDOW_MS) seenAt.delete(id);
  }
  seenAt.set(profileId, now);
};

export const isProfileOnline = (profileId: string) => {
  const seen = seenAt.get(profileId);
  return seen !== undefined && Date.now() - seen <= ONLINE_WINDOW_MS;
};

const canSeePresence = (roles: ProfileWithMeta['roles']) =>
  checkRoleCapabilities(roles, ['core-presence-read']).success;

/**
 * Attaches `online` to profiles whose presence the viewer may see. Both the
 * viewer and the target need the `core-presence-read` capability (owner via
 * `*`, admin and moderator by default); everyone else gets no presence data.
 */
export const withPresenceForViewer = (
  viewer: ProfileWithMeta | undefined,
  target: ProfileWithMeta,
  profile: PublicProfile,
): PublicProfile => {
  if (!viewer || viewer.id === target.id) return profile;
  if (!canSeePresence(viewer.roles) || !canSeePresence(target.roles)) {
    return profile;
  }
  return { ...profile, online: isProfileOnline(target.id) };
};
