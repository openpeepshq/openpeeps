import { Endpoint, z } from 'sveltekit-api';
import type { RequestEvent } from '@sveltejs/kit';
import { forbidden, notFound } from '$lib/server/api/errors';
import { ensureRoleCapabilities } from '$lib/server/auth';
import { roleSchema } from '@openpeeps/common/types';
import { findProfile } from '@openpeeps/core/profiles';

export const Output = roleSchema.array();
export const Param = z.object({
  profileId: z.string(),
});

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export default new Endpoint({ Error, Output, Param }).handle(
  async (param, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-profiles-read']);

    const profile = await findProfile(param.profileId);

    if (!profile) {
      throw notFound(`Profile with id ${param.profileId}`);
    }

    return profile.roles;
  },
);
