import { endpoint, z } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import { oauthGrantSchema } from '@openpeepshq/common/types';
import { listOAuthGrants } from '@openpeepshq/core/oauth';
import { ensureLocalProfile } from '#lib/auth';
import { authNeeded } from '#lib/errors';

export const Output = z.array(oauthGrantSchema);

export const Error = {
  401: authNeeded(),
};

export const apiEndpoint = endpoint({ Output, Error }).handle(
  async (_input, event: RequestEvent) => {
    const profile = await ensureLocalProfile(event, false);
    return listOAuthGrants(profile.id);
  },
);
