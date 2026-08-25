import { endpoint, z } from '#lib/endpoint';
import { findProfile } from '@openpeepshq/core/profiles';
import type { RequestEvent } from '@riddl/core';
import { publicProfileSchema } from '@openpeepshq/common/types';
import { ensureAccess, ensureProfileCapabilities } from '#lib/auth';
import { notFound } from '#lib/errors';

export const Output = publicProfileSchema;
export const Param = z.object({
  profileId: z.string(),
});

export const Error = {
  404: notFound(),
};

export const apiEndpoint = endpoint({ Output, Param }).handle(
  async (param, event: RequestEvent) => {
    await ensureAccess(event);

    const requestedProfile = await findProfile(param.profileId);

    if (!requestedProfile) {
      throw notFound(`Profile with id ${param.profileId}`);
    }

    await ensureProfileCapabilities(event, requestedProfile, [
      'core-profiles-read',
    ]);

    return publicProfileSchema.parse(requestedProfile);
  },
);
