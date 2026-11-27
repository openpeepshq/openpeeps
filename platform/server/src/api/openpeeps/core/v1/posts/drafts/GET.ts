import { endpoint, z } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import { publicPostSchema } from '@openpeepshq/common/types';
import { ensureLocalProfile } from '#lib/auth';
import { listMyDrafts } from '@openpeepshq/core/posts';

export const Output = publicPostSchema.array();
export const Query = z.object({
  offset: z.coerce.number().min(0).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
});

export const apiEndpoint = endpoint({ Output, Query }).handle(
  async (params, event: RequestEvent) => {
    const profile = await ensureLocalProfile(event);

    return listMyDrafts(profile, Query.parse(params));
  },
);
