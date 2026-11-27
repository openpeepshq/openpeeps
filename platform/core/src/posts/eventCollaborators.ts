import {
  checkCapabilities,
  getGroupRelationships,
} from '@openpeepshq/common/lib';
import {
  AuthorizationData,
  GroupWithMeta,
  Profile,
  ProfileWithMeta,
  Role,
  VisibilityType,
} from '@openpeepshq/common/types';

import { findProfile } from '../profiles';
import { unprocessableRequest } from '../errors';

/**
 * Validates the privilege-bearing co-organizer id list at the single write
 * chokepoint for event creation/update.
 *
 * Co-organizers derive their edit / RSVP-management rights from this list via
 * the `collaborator` post relationship (see `getPostRelationships`), so the
 * list is a grant of power and must be validated on write.
 *
 * Invoked only for event posts — the `data.type === 'event'` branch of
 * `createPost` / `updatePost` is the sole gate — so non-event posts never
 * reach this function and no internal reindexing path exists for them.
 *
 * - Every id must resolve to an existing **local** profile (federated/guest
 *   accounts cannot perform instance-side event management). Unknown target
 *   → 422.
 * - Every target must be able to see the event (public/local → any local
 *   profile; group → member; direct → allowed, the audience gate is applied
 *   separately). Target that cannot see the event → 422.
 * - Only the primary organizer, an existing co-organizer, or a caller with
 *   role-level `core-posts-update` may change the list. A co-organizer may add
 *   others and may step down, but may not remove another co-organizer.
 *   Unauthorized change → 422.
 */
export const validateEventCoOrganizers = async (args: {
  caller: Profile & { roles?: Role[] };
  organizerId: string;
  post: {
    id: string;
    visibility: VisibilityType;
    group?: GroupWithMeta | null;
  };
  /** Co-organizer ids on the stored event (empty on create). */
  previous: string[];
  /** Co-organizer ids from the incoming payload (undefined on create). */
  next: string[] | undefined;
}): Promise<string[]> => {
  const { caller, organizerId, post, previous } = args;
  const next = dedupeStringArray(args.next);

  const unchanged =
    next.length === previous.length &&
    [...next].sort().join('\u0000') === [...previous].sort().join('\u0000');
  if (unchanged) return previous;

  const callerIsOrganizer = caller.id === organizerId;
  const callerIsCoOrganizer = previous.includes(caller.id);
  const hasRoleLevelUpdate = (caller.roles ?? []).some(
    (role) =>
      checkCapabilities(
        ['core-posts-update'],
        role.capabilities ?? { add: [], remove: [] },
      ).success,
  );

  if (!callerIsOrganizer && !callerIsCoOrganizer && !hasRoleLevelUpdate) {
    throw unprocessableRequest({
      errorKey: 'error.eventCoOrganizersForbidden',
    });
  }
  // A co-organizer (who is neither the organizer nor role-level) may add
  // co-organizers and may step down, but may not remove anyone else.
  if (callerIsCoOrganizer && !callerIsOrganizer && !hasRoleLevelUpdate) {
    const removed = previous.filter((id) => !next.includes(id));
    if (removed.some((id) => id !== caller.id)) {
      throw unprocessableRequest({
        errorKey: 'error.eventCoOrganizersForbidden',
      });
    }
  }

  const resolved = new Map<string, ProfileWithMeta | undefined>();
  await Promise.all(
    next.map(async (id) => {
      if (id === caller.id || resolved.has(id)) return;
      resolved.set(id, await findProfile(id));
    }),
  );

  for (const id of next) {
    if (id === caller.id) continue;
    const target = resolved.get(id);
    if (!target || target.id !== id || target.type !== 'local') {
      throw unprocessableRequest({
        errorKey: 'error.eventCoOrganizerInvalid',
      });
    }
    if (!canSeeEvent(target, post)) {
      throw unprocessableRequest({
        errorKey: 'error.eventCoOrganizerInvisible',
      });
    }
  }

  return next;
};

const canSeeEvent = (
  target: ProfileWithMeta,
  post: { visibility: VisibilityType; group?: GroupWithMeta | null },
) => {
  switch (post.visibility) {
    case 'public':
    case 'local':
      return true;
    case 'direct':
      // The audience is enforced by the audience connector; allow the write.
      return true;
    case 'group': {
      if (!post.group) return false;
      const relationships = getGroupRelationships(
        {
          profile: target,
          account: undefined,
          scopes: [],
        } satisfies AuthorizationData,
        post.group,
      );
      return relationships.includes('member');
    }
    default:
      return false;
  }
};

const dedupeStringArray = (ids: string[] | undefined): string[] => [
  ...new Set((ids ?? []).filter((id): id is string => typeof id === 'string')),
];
