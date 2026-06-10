import { endpoint } from '#lib/endpoint';
import { badRequest, forbidden, internalError } from '#lib/errors';
import {
  type MediaStream,
  mediaStreamRequestSchema,
  mediaStreamSchema,
} from '@openpeeps/common/types';
import { ensureLocalProfile } from '#lib/auth';
import type { RequestEvent } from '@riddl/core';
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

export const apiEndpoint = endpoint({ Input, Output, Error }).handle(
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
