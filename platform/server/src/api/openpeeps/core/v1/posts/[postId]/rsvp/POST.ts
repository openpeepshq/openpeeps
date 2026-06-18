import { endpoint, z } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import {
  rsvpSchema,
  successFailureResponseSchema,
} from '@openpeeps/common/types';
import { ensureLocalProfile, ensurePostCapabilities } from '#lib/auth';
import { forbidden, notFound, rethrowIfOpenpeepsError, unprocessableRequest } from '#lib/errors';
import { findPost, rsvpRespond } from '@openpeeps/core/posts';

export const Input = rsvpSchema;
export const Output = successFailureResponseSchema;
export const Param = z.object({
  postId: z.string(),
});

export const Error = {
  403: forbidden(),
  404: notFound(),
  422: unprocessableRequest(),
};

export const apiEndpoint = endpoint({ Input, Output, Param }).handle(
  async (params, event: RequestEvent) => {
    const profile = await ensureLocalProfile(event);

    const mergedPost = await findPost(params.postId);
    if (!mergedPost) {
      throw notFound(`Post with id ${params.postId}`);
    }

    await ensurePostCapabilities(event, mergedPost, ['core-posts-rsvp']);

    await rsvpRespond(profile, mergedPost, rsvpSchema.parse(params)).catch(
      rethrowIfOpenpeepsError,
    );
    return { success: true };
  },
);
