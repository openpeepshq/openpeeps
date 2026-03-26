import { Endpoint } from 'sveltekit-api';
import { groupWithMetaSchema } from '@openpeeps/common/types';
import type { RequestEvent } from '@sveltejs/kit';
import { listGroups } from '@openpeeps/core/groups';
import { ensureProfileOrPublicCommunity } from '$lib/server/auth';

export const Output = groupWithMetaSchema.array();

export default new Endpoint({ Output }).handle(
  async (_, event: RequestEvent) => {
    const profile = await ensureProfileOrPublicCommunity(event);

    return listGroups(profile);
  },
);
