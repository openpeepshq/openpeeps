import { endpoint, z } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';

import { badRequest, forbidden, notFound } from '#lib/errors';

import { ensureRoleCapabilities } from '#lib/auth';

import { successResponseSchema } from '@openpeepshq/common/types';
import {
  enqueueMediaDeletion,
  isStorageId,
  mediaFileExists,
} from '@openpeepshq/core/media';

export const Param = z.object({
  storageId: z.string(),
});

export const Output = successResponseSchema;

export const Error = {
  400: badRequest(),
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Param, Output, Error }).handle(
  async (param, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-media-delete']);
    if (!isStorageId(param.storageId)) {
      throw badRequest('Invalid media id');
    }
    if (!(await mediaFileExists(param.storageId))) {
      throw notFound('Media file');
    }
    await enqueueMediaDeletion(param.storageId);
    return Output.parse({ success: true });
  },
);
