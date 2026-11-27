import {
  type FollowData,
  followDataSchema,
  type SuccessResponse,
} from '@openpeepshq/common/types';

import { ensureLocalProfile } from '#lib/auth';
import type { RequestEvent } from '@riddl/core';
import { z } from '#lib/';
import { forbidden, notFound } from '#lib/errors';
import {
  canFollowProfile,
  findProfile,
  follow,
  unfollow,
} from '@openpeepshq/core/profiles';
import { resolveRemoteAccount } from '@openpeepshq/core/federation';
import { isBlockedPair } from '@openpeepshq/common/lib';
import type { ProfileWithMeta } from '@openpeepshq/common/types';

/**
 * Path-parameter schema for the `profiles/[profileId]/follow` routes:
 * `profileId` is required — the generated OpenAPI must not advertise it as
 * optional. The follow-by-handle route (`profiles/follow`) carries **no**
 * path parameters at all (no `Param` export); the target arrives as
 * `input.handle` (#241 review #4). Both routes funnel into
 * `followProfileHandler`, whose input therefore types `profileId` as
 * optional (deliberate sharing).
 */
export const followParamsSchema = z.object({
  profileId: z.string(),
});

export type FollowParams = z.infer<typeof followParamsSchema>;

type FollowHandlerInput = FollowData & { profileId?: string };

/**
 * Resolve the follow target. A resolvable `profileId` wins; otherwise a
 * `handle` is resolved to a remote ActivityPub account via WebFinger (#241).
 * Returns `undefined` when neither resolves (caller maps to 404).
 */
const resolveFollowTarget = async (
  profileId: string | undefined,
  handle: string | undefined,
): Promise<ProfileWithMeta | undefined> => {
  if (profileId) {
    const existing = await findProfile(profileId);
    if (existing) return existing;
    // Fall through to remote discovery when the id is a stale/foreign id and
    // a handle was supplied alongside it.
  }
  if (handle) {
    return resolveRemoteAccount(handle);
  }
  return undefined;
};

export const followProfileHandler = async (
  followInput: FollowHandlerInput,
  event: RequestEvent,
): Promise<SuccessResponse> => {
  const profile = await ensureLocalProfile(event);
  const { profileId, handle } = followInput;
  const profileToFollow = await resolveFollowTarget(profileId, handle);

  if (!profileToFollow) {
    throw notFound(
      profileId
        ? `profile with id ${profileId}`
        : `remote account ${handle ?? ''}`,
    );
  }

  if (isBlockedPair(profile, profileToFollow.id)) {
    throw notFound(`profile with id ${profileToFollow.id}`);
  }

  const { success, missingCapabilities } = await canFollowProfile(
    profile,
    profileToFollow,
    event.context.authData,
  );
  if (!success) {
    throw forbidden(`Missing capabilities: ${missingCapabilities.join(', ')}`);
  }

  await follow(profile, profileToFollow, followDataSchema.parse(followInput));

  return {
    success: true,
  };
};

export const unfollowProfileHandler = async (
  followInput: FollowParams,
  event: RequestEvent,
): Promise<SuccessResponse> => {
  const profile = await ensureLocalProfile(event);
  const { profileId } = followInput;
  const profileToUnfollow = await findProfile(profileId);

  if (!profileToUnfollow) {
    throw notFound(`profile with id ${profileId}`);
  }

  await unfollow(profile, profileToUnfollow);

  return {
    success: true,
  };
};
