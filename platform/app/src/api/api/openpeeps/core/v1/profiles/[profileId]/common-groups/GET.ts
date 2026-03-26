import { Endpoint, z } from 'sveltekit-api';
import { findProfile, listCommonGroups } from '@openpeeps/core/profiles';
import type { RequestEvent } from '@sveltejs/kit';
import { groupWithMetaSchema } from '@openpeeps/common/types';
import { ensureProfileOrPublicCommunity } from '$lib/server/auth';
import { notFound } from '$lib/server/api/errors';

export const Output = groupWithMetaSchema.array();
export const Param = z.object({
  profileId: z.string(),
});

export const Error = {
  404: notFound(),
};

export default new Endpoint({ Output, Param }).handle(
  async (param, event: RequestEvent) => {
    const profile1 = await ensureProfileOrPublicCommunity(event);

    const profile2 = await findProfile(param.profileId);

    if (!profile1) {
      throw notFound();
    }

    if (!profile2) {
      throw notFound(`Profile with id ${param.profileId}`);
    }

    return await listCommonGroups(profile1, profile2)
  },
);
