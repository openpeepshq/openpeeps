import { endpoint, z } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import { publicPostSchema } from '@openpeepshq/common/types';
import { ensureLocalProfile } from '#lib/auth';
import { authNeeded, forbidden } from '#lib/errors';
import { listMyFeed } from '@openpeepshq/core/posts';

export const Output = publicPostSchema.array();
export const Query = z.object({
  start: z.string().optional(),
  limit: z.coerce.number().optional(),
});

export const Error = {
  401: authNeeded(),
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Output, Error, Query }).handle(
  async (params, event: RequestEvent) => {
    await ensureLocalProfile(event);
    return listMyFeed(event.context.authData, Query.parse(params));
  }
);
