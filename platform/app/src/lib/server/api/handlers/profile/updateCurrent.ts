import {
  profileDataSchema,
  type ProfileWithMeta,
  type UpdateProfileRequest,
} from '@openpeeps/common/types';

import { ensureLocalProfile } from '$lib/server/auth';
import type { RequestEvent } from '@sveltejs/kit';
import { updateProfile, findProfileByHandle } from '@openpeeps/core/profiles';
import { findGroupByHandle } from '@openpeeps/core/groups';
import { conflict } from '$lib/server/helpers';

export const updateCurrentProfileHandler = async (
  updateCurrentProfileRequest: UpdateProfileRequest,
  event: RequestEvent,
): Promise<ProfileWithMeta> => {
  const profile = await ensureLocalProfile(event);

  if (updateCurrentProfileRequest.handle && profile.handle !== updateCurrentProfileRequest.handle && (await findProfileByHandle(updateCurrentProfileRequest.handle) || await findGroupByHandle(updateCurrentProfileRequest.handle))) {
    throw conflict('profiles.handleExists');
  }

  const profileUpdate = profileDataSchema
    .partial()
    .parse(updateCurrentProfileRequest);

  return updateProfile(profile.id, profileUpdate);
};
