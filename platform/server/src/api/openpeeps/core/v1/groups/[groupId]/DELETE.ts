import { endpoint, z } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import { ensureGroupCapabilities } from '#lib/auth';
import { successResponseSchema } from '@openpeepshq/common/types';
import { deleteGroup, findGroup } from '@openpeepshq/core/groups';
import { notFound } from '#lib/errors';

export const Output = successResponseSchema;
export const Param = z.object({
  groupId: z.string(),
});

export const apiEndpoint = endpoint({ Param, Output }).handle(
  async (params, event: RequestEvent) => {
    const group = await findGroup(params.groupId);

    if (!group) {
      throw notFound();
    }

    await ensureGroupCapabilities(event, ['core-groups-delete'], group);

    await deleteGroup(group);

    return { success: true };
  },
);
