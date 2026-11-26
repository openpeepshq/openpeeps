import { endpoint, z } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import { oauthClientSchema } from '@openpeepshq/common/types';
import { listOAuthClients } from '@openpeepshq/core/oauth';
import { ensureRoleCapabilities } from '#lib/auth';
import { forbidden } from '#lib/errors';

export const Output = z.array(oauthClientSchema);

export const Error = {
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Output, Error }).handle(
  async (_input, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-config-read']);
    return listOAuthClients();
  },
);
