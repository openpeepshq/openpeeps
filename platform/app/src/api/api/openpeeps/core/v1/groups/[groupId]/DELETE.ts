import { Endpoint, z } from 'sveltekit-api';
import type { RequestEvent } from '@sveltejs/kit';
import { ensureGroupCapabilities } from '$lib/server/auth';
import { successResponseSchema } from '@openpeeps/common/types';
import { deleteGroup, findGroup } from '@openpeeps/core/groups';
import { notFound } from '$lib/server/api/errors';

export const Output = successResponseSchema;
export const Param = z.object({
  groupId: z.string(),
});

export default new Endpoint({ Param, Output }).handle(
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
