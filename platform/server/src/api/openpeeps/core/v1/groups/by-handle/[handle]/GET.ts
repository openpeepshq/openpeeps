import { endpoint, z } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import { groupWithMetaSchema } from '@openpeeps/common/types';
import { ensureGroupCapabilities, ensureProfileOrPublicCommunity } from '#lib/auth';
import { notFound } from '#lib/errors';
import { findGroupByHandle } from '@openpeeps/core/groups';

export const Output = groupWithMetaSchema;
export const Param = z.object({
  handle: z.string(),
});

export const Error = {
  404: notFound(),
};

export const apiEndpoint = endpoint({ Output, Param }).handle(
  async (param, event: RequestEvent) => {
    const group = await findGroupByHandle(param.handle);

    if (!group) {
      throw notFound(`Group with handle ${param.handle}`);
    }

    await ensureGroupCapabilities(event, ['core-groups-read'], group);

    return group;
  },
);
