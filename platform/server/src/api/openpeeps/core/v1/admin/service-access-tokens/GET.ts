import { endpoint, z } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import { publicAccessTokenSchema } from '@openpeepshq/common/types';
import { listServiceAccessTokens } from '@openpeepshq/core/accessTokens';
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
