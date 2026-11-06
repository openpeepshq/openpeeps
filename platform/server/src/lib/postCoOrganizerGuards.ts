import {
  capabilitySetsEqual,
  checkRoleCapabilities,
  profileCanReadPost,
} from '@openpeepshq/common/lib';
import type {
  Event,
  PostWithMeta,
  ProfileWithMeta,
  VisibilityType,
} from '@openpeepshq/common/types';
import { findProfile } from '@openpeepshq/core/profiles';
import { badRequest, forbidden } from './errors';

export type PostReadAccess = {
  visibility: VisibilityType;
  audience?: { id: string }[] | null;
  groupId?: string | null;
};

/**
 * Co-organizers must be existing local profiles who can read the post,
 * otherwise the `collaborator` relationship would grant `core-posts-update`
 * to profiles that cannot even see the event.
 */
export const assertCoOrganizersEligible = async (
  coOrganizerIds: string[] | undefined,
  readAccess: PostReadAccess,
) => {
  for (const id of coOrganizerIds ?? []) {
    const profile = await findProfile(id);
    if (!profile) {
      throw badRequest(`Unknown co-organizer profile ${id}`);
    }
    if (profile.type !== 'local') {
      throw badRequest(
        `Co-organizer @${profile.handle} is not a local profile`,
      );
    }
    if (!profileCanReadPost(profile, readAccess)) {
      throw badRequest(`Co-organizer @${profile.handle} cannot read this post`);
    }
  }
};

/**
 * Co-organizers hold `core-posts-update` via the `collaborator` relationship;
 * only the author or a role-level updater (e.g. admin) may change the
 * privilege-bearing event fields they could use to re-delegate edit rights.
 */
export const assertProtectedEventFieldsUnchanged = (
  profile: ProfileWithMeta,
  post: PostWithMeta,
  next: Event,
) => {
  const stored = post.data;
  if (
    stored?.type !== 'event' ||
    profile.id === post.profile.id ||
    checkRoleCapabilities(profile.roles, ['core-posts-update']).success
  ) {
    return;
  }
  const changed =
    !capabilitySetsEqual(next.coOrganizers, stored.coOrganizers) ||
    !capabilitySetsEqual(next.jam?.moderators, stored.jam?.moderators) ||
    !!next.attendeeListPublic !== !!stored.attendeeListPublic;
  if (changed) {
    throw forbidden(
      'Only the organizer or an admin can change co-organizers, jam moderators, or attendee list visibility',
    );
  }
};
