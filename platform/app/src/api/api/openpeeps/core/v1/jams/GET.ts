import { Endpoint, z } from 'sveltekit-api';
import type { RequestEvent } from '@sveltejs/kit';
import { publicPostSchema } from '@openpeeps/common';
import { listLiveJams } from '@openpeeps/core/jams';

export const Output = publicPostSchema.array();
export const Query = z.object({ live: z.enum(['true', 'false']).optional() });

export default new Endpoint({ Output, Query }).handle(
  async (_, event: RequestEvent) => {

    return listLiveJams(event.locals.authData);
  },
);
