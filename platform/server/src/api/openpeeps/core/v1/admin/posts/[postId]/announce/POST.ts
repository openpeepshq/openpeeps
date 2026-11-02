import { endpoint, z } from '#lib/endpoint';
import { successResponseSchema } from '@openpeepshq/common/types';
import { isCommunityWideVisibility } from '@openpeepshq/common/lib';
import { forbidden, notFound } from '#lib/errors';
import { ensureRoleCapabilities } from '#lib/auth';
import { hub } from '@openpeepshq/core/events';
import { findPost } from '@openpeepshq/core/posts';

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
    await ensureRoleCapabilities(event, ['core-posts-announce']);

    const post = await findPost(input.postId);

    if (!post) throw notFound(`Post with id ${input.postId}`);

    // Announcements broadcast the full post content to every member, so
    // only community-wide (public/local) posts may be announced. Without
    // this, a moderator could leak a private DM or group post to the whole
    // community through their notifications.
    if (!isCommunityWideVisibility(post.visibility)) {
      throw forbidden('Only public and local posts can be announced');
    }

    await hub.emit('postAnnounced', post);

    return { success: true };
  },
);
