import { endpoint, z } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import { publicPostSchema } from '@openpeepshq/common';
import { listLiveJams } from '@openpeepshq/core/jams';

export const Output = publicPostSchema.array();
export const Query = z.object({ live: z.enum(['true', 'false']).optional() });

export const apiEndpoint = endpoint({ Output, Query }).handle(
  async (_, event: RequestEvent) => {

    return listLiveJams(event.context.authData);
  },
);
