import { endpoint, z } from '#lib/endpoint';
import { conflict, forbidden, notFound } from '#lib/errors';
import { ensureLocalProfile } from '#lib/auth';
import type { RequestEvent } from '@riddl/core';
import { findGroup, removeMembersFromGroup } from '@openpeepshq/core/groups';
import { successResponseSchema } from '@openpeepshq/common/types';
import { hub } from '@openpeepshq/core/events';
import { ensureGroupOwnerRemovable } from '#lib/groupOwnerGuards';

export const Output = successResponseSchema;
export const Param = z.object({
  groupId: z.string(),
});

export const Error = {
  403: forbidden(),
  404: notFound(),
  409: conflict(),
};

export const apiEndpoint = endpoint({ Param, Output, Error }).handle(
  async (input, event: RequestEvent) => {
    const profile = await ensureLocalProfile(event);

    const group = await findGroup(input.groupId);

    if (!group) {
      throw notFound();
    }

    await ensureGroupOwnerRemovable(group, profile);

    await removeMembersFromGroup(group, [profile]);

    await hub.emit('groupMemberLeft', group, profile);

    return { success: true };
  },
);
