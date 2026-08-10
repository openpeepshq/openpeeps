import { endpoint, z } from '#lib/endpoint';
import { forbidden, notFound } from '#lib/errors';
import { ensureGroupCapabilities, ensureLocalProfile } from '#lib/auth';
import type { RequestEvent } from '@riddl/core';
import { addMembersToGroup, findGroup } from '@openpeepshq/core/groups';
import { successResponseSchema } from '@openpeepshq/common/types';
import { hub } from '@openpeepshq/core/events';

export const Output = successResponseSchema;
export const Param = z.object({
  groupId: z.string(),
});

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Param, Output, Error }).handle(
  async (input, event: RequestEvent) => {
    const profile = await ensureLocalProfile(event);

    const group = await findGroup(input.groupId);

    if (!group) {
      throw notFound();
    }

    await ensureGroupCapabilities(event, ['core-groups-join'], group);

    await addMembersToGroup(group, [profile]);

    await hub.emit('groupMemberJoined', group, profile);

    return { success: true };
  },
);
