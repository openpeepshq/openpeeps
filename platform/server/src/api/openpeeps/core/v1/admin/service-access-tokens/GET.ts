import { endpoint, z } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import { publicAccessTokenSchema } from '@openpeeps/common/types';
import { listServiceAccessTokens } from '@openpeeps/core/accessTokens';
import { forbidden } from '#lib/errors';
import { ensureRoleCapabilities } from '#lib/auth';

export const Output = z.array(publicAccessTokenSchema);

export const Error = {
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Output, Error }).handle(
  async (_params, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-serviceTokens-read']);
    return listServiceAccessTokens();
  },
);
