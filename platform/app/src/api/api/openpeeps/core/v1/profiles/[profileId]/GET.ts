import { Endpoint, z } from 'sveltekit-api';
import { findProfile } from '@openpeeps/core/profiles';
import type { RequestEvent } from '@sveltejs/kit';
import { publicProfileSchema } from '@openpeeps/common/types';
import { ensureProfileCapabilities, ensureAccess } from '$lib/server/auth';
import { notFound } from '$lib/server/api/errors';

export const Output = publicProfileSchema;
export const Param = z.object({
  profileId: z.string(),
});

export const Error = {
  404: notFound(),
};

export default new Endpoint({ Output, Param }).handle(
  async (param, event: RequestEvent) => {
    await ensureAccess(event);

    const requestedProfile = await findProfile(param.profileId);

    if (!requestedProfile) {
      throw notFound(`Profile with id ${param.profileId}`);
    }

    await ensureProfileCapabilities(event, requestedProfile, ['core-profiles-read']);

    return publicProfileSchema.parse(requestedProfile);
  },
);
