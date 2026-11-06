import { endpoint, z } from '#lib/endpoint';
import { successResponseSchema } from '@openpeepshq/common/types';
import { isCommunityWideVisibility } from '@openpeepshq/common/lib';
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

    // The highlights feed is visible to the whole community, so only
    // community-wide (public/local) posts may be highlighted. Without
    // this, a moderator could leak a private DM or group post.
    if (!isCommunityWideVisibility(post.visibility)) {
      throw forbidden('Only public and local posts can be highlighted');
    }

    await setPostHighlighted(post, true);

    return { success: true };
  },
);
