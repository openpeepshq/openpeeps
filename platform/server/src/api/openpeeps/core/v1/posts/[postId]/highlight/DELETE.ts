import { endpoint, z } from '#lib/endpoint';
import { successResponseSchema } from '@openpeepshq/common/types';
import { forbidden, notFound } from '#lib/errors';
import { ensureRoleCapabilities } from '#lib/auth';
import { findPost, setPostHighlighted } from '@openpeepshq/core/posts';

export const Param = z.object({
  postId: z.string(),
});

export const Output = successResponseSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Param, Output, Error }).handle(
  async (input, event) => {
    await ensureRoleCapabilities(event, ['core-posts-highlight']);

    const post = await findPost(input.postId);

    if (!post) throw notFound(`Post with id ${input.postId}`);

    // Removing a highlight only ever narrows exposure, so unlike POST there
    // is no visibility check to prevent a leak.
    await setPostHighlighted(post, false);

    return { success: true };
  },
);
