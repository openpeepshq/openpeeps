import { endpoint, z } from '#lib/endpoint';
import { deleteProfile, getProfile } from '@openpeepshq/core/profiles';
import type { RequestEvent } from '@riddl/core';
import { ensureRoleCapabilities } from '#lib/auth';
import { forbidden, notFound } from '#lib/errors';
import { successResponseSchema } from '@openpeepshq/common/types';

export const Output = successResponseSchema;
export const Param = z.object({
  profileId: z.string(),
});

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Param, Output, Error }).handle(
  async (param, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-profiles-delete']);

    // Resolve ignoring the soft-delete filter: a deactivated (soft-deleted)
    // member must still be hard-deletable; a hard-deleted member has no row.
    const requestedProfile = await getProfile(param.profileId, true);

    if (!requestedProfile) {
      throw notFound(`Profile with id ${param.profileId}`);
    }

    await deleteProfile(param.profileId);

    return { success: true };
  },
);
