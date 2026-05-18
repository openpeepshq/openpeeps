import { Endpoint } from 'sveltekit-api';
import { badRequest, forbidden, internalError } from '$lib/server/api/errors';
import {
  type MediaStream,
  mediaStreamRequestSchema,
  mediaStreamSchema,
} from '@openpeeps/common/types';
import { ensureLocalProfile } from '$lib/server/auth';
import type { RequestEvent } from '@sveltejs/kit';
import {
  ensureStreamingJob,
  parseLocalStorageUrl,
} from '@openpeeps/core/media';

export const Input = mediaStreamRequestSchema;
export const Output = mediaStreamSchema;

export const Error = {
  400: badRequest(),
  403: forbidden(),
  500: internalError(),
};

export default new Endpoint({ Input, Output, Error }).handle(
  async (input, event: RequestEvent): Promise<MediaStream> => {
    await ensureLocalProfile(event);

    const storageId = await parseLocalStorageUrl(input.url);
    if (!storageId) {
      throw badRequest(
        'url must be a storage url served by this server',
      );
    }

    // Shared with the postCreated pre-warm handler — handles access tracking,
    // directory creation, stale-job removal, and queue dedup in one place.
    return ensureStreamingJob(storageId);
  },
);
