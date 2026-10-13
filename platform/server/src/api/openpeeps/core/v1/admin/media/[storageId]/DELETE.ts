import { endpoint, z } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import { badRequest, forbidden, notFound } from '#lib/errors';
import { ensureRoleCapabilities } from '#lib/auth';
import { successResponseSchema } from '@openpeepshq/common/types';
import { deleteStoredMediaNow, isStorageId } from '@openpeepshq/core/media';

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
    const removed = await deleteStoredMediaNow(param.storageId);
    if (!removed) {
      throw notFound('Media file');
    }
    return Output.parse({ success: true });
  },
);
