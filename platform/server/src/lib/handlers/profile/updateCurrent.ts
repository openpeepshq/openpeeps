import {
  profileDataSchema,
  type ProfileWithMeta,
  type UpdateProfileRequest,
} from '@openpeepshq/common/types';

import { ensureLocalProfile } from '#lib/auth';
import type { RequestEvent } from '@riddl/core';
import { updateProfile, findProfileByHandle } from '@openpeepshq/core/profiles';
import { findGroupByHandle } from '@openpeepshq/core/groups';
import { conflict } from '#lib/helpers';

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
