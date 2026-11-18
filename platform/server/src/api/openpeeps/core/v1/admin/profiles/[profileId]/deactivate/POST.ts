import { endpoint, z } from '#lib/endpoint';
import { deactivateProfile, findProfile } from '@openpeepshq/core/profiles';
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
    await ensureRoleCapabilities(event, ['core-profiles-deactivate']);

    const requestedProfile = await findProfile(param.profileId);

    if (!requestedProfile) {
      throw notFound(`Profile with id ${param.profileId}`);
    }

    await deactivateProfile(param.profileId);

    return { success: true };
  },
);
