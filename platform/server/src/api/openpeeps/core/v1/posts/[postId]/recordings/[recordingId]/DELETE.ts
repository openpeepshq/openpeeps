import { endpoint, z } from '#lib/endpoint';
import { canAccessJamRecordings } from '@openpeeps/common/lib';
import { successResponseSchema } from '@openpeeps/common/types';
import { deleteJamRecording } from '@openpeeps/core/jams';
import { findPost } from '@openpeeps/core/posts';
import { badRequest, forbidden, notFound } from '#lib/errors';
import { ensureLocalProfile } from '#lib/auth';

export const Param = z.object({
  postId: z.string(),
  recordingId: z.string(),
});

export const Output = successResponseSchema;

export const Error = {
  404: notFound(),
  403: forbidden(),
  400: badRequest(),
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
      await deleteJamRecording(post, param.recordingId);
      return { success: true };
    } catch (error) {
      if (!(error instanceof globalThis.Error)) {
        throw error;
      }

      if (error.message === 'Recording not found') {
        throw notFound(error.message);
      }

      if (
        error.message === 'Recording is still in progress' ||
        error.message === 'Recording does not belong to this event'
      ) {
        throw badRequest(error.message);
      }

      throw error;
    }
  },
);
