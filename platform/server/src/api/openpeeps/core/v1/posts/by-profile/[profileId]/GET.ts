import { endpoint, z } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import { publicPostSchema } from '@openpeeps/common/types';
import { ensureProfileOrPublicCommunity } from '#lib/auth';
import { notFound } from '#lib/errors';
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

export const apiEndpoint = endpoint({ Output, Param, Query }).handle(
  async (params, event: RequestEvent) => {
    await ensureProfileOrPublicCommunity(event);

    const requestedProfile = await findProfile(params.profileId);

    if (!requestedProfile) {
      throw notFound(`Profile with id ${params.profileId}`);
    }

    return listPostsByProfile(
      event.context.authData,
      requestedProfile,
      Query.parse(params),
    );
  },
);
