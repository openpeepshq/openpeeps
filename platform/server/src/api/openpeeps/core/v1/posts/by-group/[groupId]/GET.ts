import { endpoint, z } from '#lib/endpoint';
import { publicPostSchema } from '@openpeeps/common/types';
import type { RequestEvent } from '@riddl/core';
import { listPostsByGroup } from '@openpeeps/core/posts';
import { ensureProfileOrPublicCommunity } from '#lib/auth';
import { forbidden } from '#lib/errors';

export const Param = z.object({
  groupId: z.string(),
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
    return listPostsByGroup(
      event.context.authData,
      params.groupId,
      Query.parse(params),
    );
  },
);
