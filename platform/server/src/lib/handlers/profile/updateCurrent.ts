import {
  profileDataSchema,
  type ProfileWithMeta,
  type UpdateProfileRequest,
} from '@openpeepshq/common/types';

import { ensureLocalProfile, ensureScope } from '#lib/auth';
import type { RequestEvent } from '@riddl/core';
import { updateProfile, findProfileByHandle } from '@openpeepshq/core/profiles';
import { findGroupByHandle } from '@openpeepshq/core/groups';
import { conflict } from '#lib/errors';
import { assertHandleAllowed } from '#lib/forbiddenHandles';

export const updateCurrentProfileHandler = async (
  updateCurrentProfileRequest: UpdateProfileRequest,
  event: RequestEvent,
): Promise<ProfileWithMeta> => {
  const profile = await ensureLocalProfile(event);
  // Scoped (PAT) tokens need write access to the profile they act on; a
  // read-only token must not be able to rename the member or change flags.
  // Web/RN sessions carry a full-privilege scope and always pass.
  await ensureScope(event, 'write', { type: 'profiles', id: profile.id });

  if (
    updateCurrentProfileRequest.handle &&
    profile.handle !== updateCurrentProfileRequest.handle
  ) {
    await assertHandleAllowed(updateCurrentProfileRequest.handle);
    if (
      (await findProfileByHandle(updateCurrentProfileRequest.handle)) ||
      (await findGroupByHandle(updateCurrentProfileRequest.handle))
    ) {
      throw conflict('profiles.handleExists');
    }
  }

  const profileUpdate = profileDataSchema
    .partial()
    .parse(updateCurrentProfileRequest);

  return updateProfile(profile.id, profileUpdate);
};
