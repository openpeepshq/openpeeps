import { endpoint, z } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import { successResponseSchema } from '@openpeepshq/common/types';
import { deleteOAuthClient } from '@openpeepshq/core/oauth';
import { ensureRoleCapabilities } from '#lib/auth';
import { forbidden, notFound } from '#lib/errors';

export const Param = z.object({ clientId: z.string() });
export const Output = successResponseSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

// Deleting a client also signs every user out of it (grants, refresh and
// access tokens).
export const apiEndpoint = endpoint({ Param, Output, Error }).handle(
  async ({ clientId }: { clientId: string }, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-config-update']);
    if (!(await deleteOAuthClient(clientId))) {
      throw notFound('OAuth client');
    }
    return { success: true as const };
  },
);
