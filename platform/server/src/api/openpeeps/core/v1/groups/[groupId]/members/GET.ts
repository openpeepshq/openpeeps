import { endpoint, z } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import { ensureGroupCapabilities } from '#lib/auth';
import { findGroup } from '@openpeeps/core/groups';
import { listGroupMembers } from '@openpeeps/core/profiles';
import { groupMemberSchema } from '@openpeeps/common/types';
import { notFound } from '#lib/errors';

export const Output = groupMemberSchema.array();
export const Param = z.object({
  groupId: z.string(),
});

export const apiEndpoint = endpoint({ Param, Output }).handle(
  async (params, event: RequestEvent) => {

    const group = await findGroup(params.groupId);

    if (!group) {
      throw notFound();
    }

    await ensureGroupCapabilities(event, ['core-groups-read'], group);

    return listGroupMembers(group);
  },
);
