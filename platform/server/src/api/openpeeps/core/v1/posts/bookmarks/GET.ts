import { endpoint, z } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import { publicPostSchema } from '@openpeepshq/common/types';
import { ensureLocalProfile } from '#lib/auth';
import { listBookmarkedPosts } from '@openpeepshq/core/posts';

export const Output = publicPostSchema.array();
export const Query = z.object({
  start: z.string().optional(),
  limit: z.coerce.number().optional(),
});

export const apiEndpoint = endpoint({ Output, Query }).handle(
  async (params, event: RequestEvent) => {
    const profile = await ensureLocalProfile(event);

    return listBookmarkedPosts(
      event.context.authData,
      profile,
      Query.parse(params),
    );
  },
);
