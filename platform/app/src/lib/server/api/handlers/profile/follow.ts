import {
  type FollowData,
  followDataSchema,
  type SuccessResponse,
} from '@openpeeps/common/types';

import { ensureLocalProfile, ensureProfileCapabilities } from '$lib/server/auth';
import type { RequestEvent } from '@sveltejs/kit';
import { z } from 'sveltekit-api';
import { notFound } from '$lib/server/helpers';
import { findProfile, follow, unfollow } from '@openpeeps/core/profiles';

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

  await ensureProfileCapabilities(event, profileToFollow, ['core-profiles-follow']);

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
