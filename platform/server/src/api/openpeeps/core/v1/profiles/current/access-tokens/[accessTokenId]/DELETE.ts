import { endpoint, z } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import { successResponseSchema, type AccessTokenWithMeta } from '@openpeeps/common/types';
import { findAccessToken, revokeAccessToken } from '@openpeeps/core/accessTokens';
import { forbidden, notFound } from '#lib/errors';
import { ensureAccessTokenCapabilities } from '#lib/auth';

export const Param = z.object({
  accessTokenId: z.string().uuid(),
});

export const Output = successResponseSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Param, Output, Error }).handle(
  async (param, event: RequestEvent) => {
    const token: AccessTokenWithMeta | undefined = await findAccessToken(param.accessTokenId);
    if (!token) {
      throw notFound();
    }

    await ensureAccessTokenCapabilities(event, token, ['core-serviceTokens-delete']);

    await revokeAccessToken(token.id);
    return { success: true as const };
  },
);
