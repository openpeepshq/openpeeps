import { endpoint, z } from '#lib/endpoint';
import { publicPostSchema } from '@openpeepshq/common/types';
import type { RequestEvent } from '@riddl/core';
import { listPostsByTag } from '@openpeepshq/core/posts';
import { ensureProfileOrPublicCommunity } from '#lib/auth';
import { forbidden } from '#lib/errors';

export const Param = z.object({
  hashtag: z.string(),
});
export const Output = publicPostSchema.array();
export const Query = z.object({
  start: z.string().optional(),
  limit: z.coerce.number().optional(),
});

export const Error = {
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Param, Output, Error, Query }).handle(
  async (params, event: RequestEvent) => {
    await ensureProfileOrPublicCommunity(event);
    return listPostsByTag(
      event.context.authData,
      params.hashtag,
      Query.parse(params),
    );
  },
);
