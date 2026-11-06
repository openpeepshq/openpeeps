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
import { isBlockedPair } from '@openpeepshq/common/lib';

export const followParamsSchema = z.object({
  profileId: z.string(),
});

export type FollowParams = z.infer<typeof followParamsSchema>;

export const followProfileHandler = async (
  followInput: FollowData & FollowParams,
  event: RequestEvent,
): Promise<SuccessResponse> => {
  const profile = await ensureLocalProfile(event);
  const { profileId } = followInput;
  const profileToFollow = await findProfile(profileId);

  if (!profileToFollow) {
    throw notFound(`profile with id ${profileId}`);
  }

  if (isBlockedPair(profile, profileToFollow.id)) {
    throw notFound(`profile with id ${profileId}`);
  }

  const { success, missingCapabilities } = await canFollowProfile(
    profile,
    profileToFollow,
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
