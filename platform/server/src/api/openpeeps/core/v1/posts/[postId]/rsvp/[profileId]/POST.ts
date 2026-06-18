import { endpoint, z } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import { successResponseSchema } from '@openpeeps/common/types';
import { ensureLocalProfile } from '#lib/auth';
import { forbidden, notFound, rethrowIfOpenpeepsError, unprocessableRequest } from '#lib/errors';
import { findPost, rsvpManageByOrganizer } from '@openpeeps/core/posts';
import { findProfile } from '@openpeeps/core/profiles';

export const Input = z.object({
  response: z.enum(['removed', 'yes']),
});
export const Output = successResponseSchema;
export const Param = z.object({
  postId: z.string(),
  profileId: z.string(),
});

export const Error = {
  403: forbidden(),
  404: notFound(),
  422: unprocessableRequest(),
};

export const apiEndpoint = endpoint({ Input, Param, Output, Error }).handle(
  async (params, event: RequestEvent) => {
    const actingProfile = await ensureLocalProfile(event);

    const mergedPost = await findPost(params.postId);
    if (!mergedPost) {
      throw notFound(`Post with id ${params.postId}`);
    }

    const targetProfile = await findProfile(params.profileId);
    if (!targetProfile) {
      throw notFound(`Profile with id ${params.profileId}`);
    }

    await rsvpManageByOrganizer(
      actingProfile,
      targetProfile,
      mergedPost,
      params.response,
    ).catch(rethrowIfOpenpeepsError);

    return { success: true };
  },
);
