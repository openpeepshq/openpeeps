import { endpoint, z } from '#lib/endpoint';
import { canAccessJamRecordings } from '@openpeepshq/common/lib';
import { jamRecordingSchema } from '@openpeepshq/common/types';
import { publishJamRecordingReply } from '@openpeepshq/core/jams';
import { findPost } from '@openpeepshq/core/posts';
import { badRequest, conflict, forbidden, notFound } from '#lib/errors';
import { ensureLocalProfile } from '#lib/auth';

export const Param = z.object({
  postId: z.string(),
  recordingId: z.string(),
});

export const Output = jamRecordingSchema;

export const Error = {
  404: notFound(),
  403: forbidden(),
  400: badRequest(),
  409: conflict(),
};

export const apiEndpoint = endpoint({ Param, Output, Error }).handle(
  async (param, event) => {
    const profile = await ensureLocalProfile(event);

    const post = await findPost(param.postId);

    if (!post) {
      throw notFound(`Object with id ${param.postId}`);
    }

    if (!canAccessJamRecordings(profile, post)) {
      throw forbidden();
    }

    try {
      return await publishJamRecordingReply(post, param.recordingId);
    } catch (error) {
      if (!(error instanceof globalThis.Error)) {
        throw error;
      }

      if (error.message === 'Recording not found') {
        throw notFound(error.message);
      }

      if (error.message === 'Recording already published') {
        throw conflict(error.message);
      }

      if (
        error.message === 'Recording is not ready' ||
        error.message === 'Recording does not belong to this event'
      ) {
        throw badRequest(error.message);
      }

      throw error;
    }
  },
);
