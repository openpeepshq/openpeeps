import { endpoint, z } from '#lib/endpoint';
import { successResponseSchema } from '@openpeepshq/common/types';
import { authNeeded, forbidden, notFound } from '#lib/errors';
import { ensureLocalProfile } from '#lib/auth';
import { findPost } from '@openpeepshq/core/posts';
import { pinPostOnProfile } from '@openpeepshq/core/profiles';

export const Input = z.object({
  postId: z.string(),
});

export const Output = successResponseSchema;

export const Error = {
  401: authNeeded(),
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Input, Output, Error }).handle(
  async (input, event) => {
    const profile = await ensureLocalProfile(event);

    if (input.postId) {
      const post = await findPost(input.postId, event.context.authData);
      if (!post || post.deletedAt) {
        throw notFound(`Object with id ${input.postId}`);
      }
      if (post.profile.id !== profile.id) {
        throw forbidden();
      }
    }

    await pinPostOnProfile(profile, input.postId);

    return { success: true };
  },
);
