import { Endpoint, z } from 'sveltekit-api';
import type { RequestEvent } from '@sveltejs/kit';
import { groupWithMetaSchema } from '@openpeeps/common/types';
import { ensureGroupCapabilities, ensureProfileOrPublicCommunity } from '$lib/server/auth';
import { notFound } from '$lib/server/api/errors';
import { findGroupByHandle } from '@openpeeps/core/groups';

export const Output = groupWithMetaSchema;
export const Param = z.object({
  handle: z.string(),
});

export const Error = {
  404: notFound(),
};

export default new Endpoint({ Output, Param }).handle(
  async (param, event: RequestEvent) => {
    const group = await findGroupByHandle(param.handle);

    if (!group) {
      throw notFound(`Group with handle ${param.handle}`);
    }

    await ensureGroupCapabilities(event, ['core-groups-read'], group);

    return group;
  },
);
