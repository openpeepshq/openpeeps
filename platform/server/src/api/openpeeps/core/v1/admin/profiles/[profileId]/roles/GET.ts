import { endpoint, z } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import { forbidden, notFound } from '#lib/errors';
import { ensureRoleCapabilities } from '#lib/auth';
import { roleSchema } from '@openpeepshq/common/types';
import { findProfile } from '@openpeepshq/core/profiles';

export const Output = roleSchema.array();
export const Param = z.object({
  profileId: z.string(),
});

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Error, Output, Param }).handle(
  async (param, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-profiles-read']);

    const profile = await findProfile(param.profileId);

    if (!profile) {
      throw notFound(`Profile with id ${param.profileId}`);
    }

    return profile.roles;
  },
);
