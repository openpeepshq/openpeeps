import { endpoint, z } from '#lib/endpoint';
import { findProfile, listCommonGroups } from '@openpeepshq/core/profiles';
import type { RequestEvent } from '@riddl/core';
import { groupWithMetaSchema } from '@openpeepshq/common/types';
import { ensureProfileOrPublicCommunity } from '#lib/auth';
import { notFound } from '#lib/errors';

export const Output = groupWithMetaSchema.array();
export const Param = z.object({
  profileId: z.string(),
});

export const Error = {
  404: notFound(),
};

export const apiEndpoint = endpoint({ Output, Param }).handle(
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
