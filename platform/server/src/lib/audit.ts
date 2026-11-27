import type { ProfileWithMeta } from '@openpeepshq/common/types';
import type { RequestEvent } from '@riddl/core';
import { recordAuditEntry } from '@openpeepshq/core/auditLog';
import { findProfileByHandle } from '@openpeepshq/core/profiles';
import { clientIp } from '#lib/auth';

/**
 * Fire-and-forget audit entry for an admin route. The actor is the acting
 * profile (already loaded by the auth middleware); the IP is captured from
 * the request. A failed write never rejects the returned promise — it is
 * logged server-side by `recordAuditEntry` itself.
 */
export const auditAction = (
  event: RequestEvent,
  actor: ProfileWithMeta,
  data: {
    action: string;
    targetType: string;
    targetId?: string | null;
    targetLabel?: string | null;
    metadata?: Record<string, unknown> | null;
  },
) =>
  recordAuditEntry(
    {
      ...data,
      actorProfileId: actor.id,
    },
    {
      profile: actor,
      ip: clientIp(event),
    },
  );

const PROFILE_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The audit-log `actor` filter accepts a profile ID or a profile handle
 * (the UI displays handles, so an admin filters by what they can see).
 * Handles resolve to the profile ID via a local lookup.
 *
 * Returns the profile ID to filter on, or `null` when a non-blank filter was
 * given but resolves to no profile — callers must treat `null` as "match
 * nothing" (return an empty result), never as "no filter". A deleted (soft-
 * deleted) profile also resolves to `null`: the lookup does not traverse
 * soft-deleted profiles, so filtering on a deleted handle shows nothing
 * rather than silently hiding that profile's entries.
 */
export const resolveActorFilter = async (
  actor: string | undefined,
): Promise<string | null | undefined> => {
  if (!actor) return undefined;
  const value = actor.trim();
  if (!value) return undefined;
  if (PROFILE_ID_PATTERN.test(value)) return value;
  const profile = await findProfileByHandle(value);
  return profile ? profile.id : null;
};
