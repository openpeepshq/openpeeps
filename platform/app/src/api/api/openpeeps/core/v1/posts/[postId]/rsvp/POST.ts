import { Endpoint, z } from 'sveltekit-api';
import type { RequestEvent } from '@sveltejs/kit';
import {
  rsvpSchema,
  successFailureResponseSchema,
} from '@openpeeps/common/types';
import { ensureLocalProfile, ensurePostCapabilities } from '$lib/server/auth';
import { notFound, forbidden } from '$lib/server/api/errors';
import { findPost, rsvpRespond } from '@openpeeps/core/posts';

export const Input = rsvpSchema;
export const Output = successFailureResponseSchema;
export const Param = z.object({
  postId: z.string(),
});

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export default new Endpoint({ Input, Output, Param }).handle(
  async (params, event: RequestEvent) => {
    const profile = await ensureLocalProfile(event);

    const mergedPost = await findPost(params.postId);
    if (!mergedPost) {
      throw notFound(`Post with id ${params.postId}`);
    }

    await ensurePostCapabilities(event, mergedPost, ['core-posts-rsvp']);

    await rsvpRespond(profile, mergedPost, rsvpSchema.parse(params));
    return { success: true };
  },
);
