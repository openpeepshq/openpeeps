import { endpoint, z } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import { successResponseSchema } from '@openpeepshq/common/types';
import { revokeOAuthGrant } from '@openpeepshq/core/oauth';
import { ensureLocalProfile } from '#lib/auth';
import { authNeeded, notFound } from '#lib/errors';

export const Param = z.object({ clientId: z.string() });
export const Output = successResponseSchema;

export const Error = {
  401: authNeeded(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Param, Output, Error }).handle(
  async ({ clientId }: { clientId: string }, event: RequestEvent) => {
    const profile = await ensureLocalProfile(event, false);
    if (!(await revokeOAuthGrant(profile.id, clientId))) {
      throw notFound('Connected app');
    }
    return { success: true as const };
  },
);
