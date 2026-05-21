import { Endpoint, z } from 'sveltekit-api';
import { jamRecordingSchema } from '@openpeeps/common/types';
import { listPostRecordings } from '@openpeeps/core/jams';
import { findPost } from '@openpeeps/core/posts';
import { forbidden, notFound } from '$lib/server/api/errors';
import { ensurePostCapabilities } from '$lib/server/auth';

export const Param = z.object({
  postId: z.string(),
});

export const Output = z.array(jamRecordingSchema);

export const Error = {
  404: notFound(),
  403: forbidden(),
};

export default new Endpoint({ Param, Output, Error }).handle(
  async (param, event) => {
    const post = await findPost(param.postId);

    if (!post) {
      throw notFound(`Object with id ${param.postId}`);
    }

    await ensurePostCapabilities(event, post, ['core-posts-read']);

    const recordings = await listPostRecordings(post.id);

    return recordings.filter((recording) => recording.status !== 'failed');
  },
);
