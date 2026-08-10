import { endpoint, z } from '#lib/endpoint';
import { successResponseSchema } from '@openpeepshq/common/types';
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

    await hub.emit('postAnnounced', post);

    return { success: true };
  },
);
