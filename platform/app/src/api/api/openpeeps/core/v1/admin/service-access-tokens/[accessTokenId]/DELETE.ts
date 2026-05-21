import { Endpoint, z } from 'sveltekit-api';
import type { RequestEvent } from '@sveltejs/kit';
import { successResponseSchema } from '@openpeeps/common/types';
import {
  findAccessToken,
  isServiceAccessToken,
  revokeAccessToken,
} from '@openpeeps/core/accessTokens';
import { forbidden, notFound } from '$lib/server/api/errors';
import { ensureRoleCapabilities } from '$lib/server/auth';

export const Param = z.object({
  accessTokenId: z.string().uuid(),
});

export const Output = successResponseSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export default new Endpoint({ Param, Output, Error }).handle(
  async (param, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-serviceTokens-delete']);

    const token = await findAccessToken(param.accessTokenId);
    if (!token || !isServiceAccessToken(token)) {
      throw notFound();
    }

    await revokeAccessToken(token.id);
    return { success: true as const };
  },
);
