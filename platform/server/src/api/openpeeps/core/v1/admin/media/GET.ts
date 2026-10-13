import { endpoint } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import { forbidden } from '#lib/errors';
import { ensureRoleCapabilities } from '#lib/auth';
import { storedMediaListSchema } from '@openpeepshq/common/types';
import { listStoredMedia } from '@openpeepshq/core/media';

export const Output = storedMediaListSchema;
export const Error = {
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Error, Output }).handle(
  async (_, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-media-read']);
    return Output.parse(await listStoredMedia());
  },
);
