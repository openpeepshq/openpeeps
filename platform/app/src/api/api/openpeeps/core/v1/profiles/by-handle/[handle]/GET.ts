import { Endpoint, z } from 'sveltekit-api';
import { findProfileByHandle } from '@openpeeps/core/profiles';
import type { RequestEvent } from '@sveltejs/kit';
import { publicProfileSchema } from '@openpeeps/common/types';
import {
  ensureProfileCapabilities,
  ensureProfileOrPublicCommunity,
} from '$lib/server/auth';
import { notFound } from '$lib/server/api/errors';

export const Output = publicProfileSchema;
export const Param = z.object({
  handle: z.string(),
});

export const Error = {
  404: notFound(),
};

export default new Endpoint({ Output, Param }).handle(
  async (param, event: RequestEvent) => {
    await ensureProfileOrPublicCommunity(event);

    const requestedProfile = await findProfileByHandle(param.handle);

    if (!requestedProfile) {
      throw notFound(`Profile with id ${param.handle}`);
    }

      await ensureProfileCapabilities(event, requestedProfile, [
        'core-profiles-read',
      ]);

    return publicProfileSchema.parse(requestedProfile);
  },
);
