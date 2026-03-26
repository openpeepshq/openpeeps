import { Endpoint, z } from 'sveltekit-api';
import type { RequestEvent } from '@sveltejs/kit';
import { ensureGroupCapabilities } from '$lib/server/auth';
import { findGroup } from '@openpeeps/core/groups';
import { listGroupMembers } from '@openpeeps/core/profiles';
import { groupMemberSchema } from '@openpeeps/common/types';
import { notFound } from '$lib/server/api/errors';

export const Output = groupMemberSchema.array();
export const Param = z.object({
  groupId: z.string(),
});

export default new Endpoint({ Param, Output }).handle(
  async (params, event: RequestEvent) => {

    const group = await findGroup(params.groupId);

    if (!group) {
      throw notFound();
    }

    await ensureGroupCapabilities(event, ['core-groups-read'], group);

    return listGroupMembers(group);
  },
);
