import { Endpoint, z } from 'sveltekit-api';
import type { RequestEvent } from '@sveltejs/kit';
import { publicPostSchema } from '@openpeeps/common/types';
import { ensureAccess } from '$lib/server/auth';
import { notFound } from '$lib/server/api/errors';
import { findProfile } from '@openpeeps/core/profiles';
import { listPostsByProfile } from '@openpeeps/core/posts';

export const Output = publicPostSchema.array();
export const Param = z.object({
  profileId: z.string(),
});
export const Query = z.object({
  start: z.string().optional(),
  limit: z.coerce.number().optional(),
});
export const Error = {
  404: notFound(),
};

export default new Endpoint({ Output, Param, Query }).handle(
  async (params, event: RequestEvent) => {
    await ensureAccess(event);

    const requestedProfile = await findProfile(params.profileId);

    if (!requestedProfile) {
      throw notFound(`Profile with id ${params.profileId}`);
    }

    return listPostsByProfile(event.locals.authData, requestedProfile, Query.parse(params));
  },
);
