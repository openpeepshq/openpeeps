import { endpoint, z } from '#lib/endpoint';
import { canAccessJamRecordings } from '@openpeepshq/common/lib';
import { jamRecordingSchema } from '@openpeepshq/common/types';
import { listPostRecordings } from '@openpeepshq/core/jams';
import { findPost } from '@openpeepshq/core/posts';
import { forbidden, notFound } from '#lib/errors';
import { ensureLocalProfile } from '#lib/auth';

export const Param = z.object({
  postId: z.string(),
});

export const Output = z.array(jamRecordingSchema);

export const Error = {
  404: notFound(),
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Param, Output, Error }).handle(
  async (param, event) => {
    const post = await findPost(param.postId);

    if (!post) {
      throw notFound(`Object with id ${param.postId}`);
    }

    const profile = await ensureLocalProfile(event);

    if (!canAccessJamRecordings(profile, post)) {
      throw forbidden();
    }

    const recordings = await listPostRecordings(post.id);

    return recordings.filter((recording) => recording.status !== 'failed');
  },
);
