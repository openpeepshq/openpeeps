import { endpoint, z } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import {
  oauthClientSecretRotatedSchema,
  type OAuthClientSecretRotated,
} from '@openpeepshq/common/types';
import { rotateOAuthClientSecret } from '@openpeepshq/core/oauth';
import { ensureRoleCapabilities } from '#lib/auth';
import { forbidden, notFound } from '#lib/errors';

export const Param = z.object({ clientId: z.string() });
export const Output = oauthClientSecretRotatedSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

// Rotating a secret does not sign users out: issued tokens stay valid.
export const apiEndpoint = endpoint({ Param, Output, Error }).handle(
  async ({ clientId }: { clientId: string }, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-config-update']);
    const clientSecret = await rotateOAuthClientSecret(clientId);
    if (clientSecret === undefined) {
      throw notFound('confidential OAuth client');
    }
    const result: OAuthClientSecretRotated = { clientSecret };
    return result;
  },
);
