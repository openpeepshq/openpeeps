import { endpoint, z } from '#lib/endpoint';
import { publicProfileSchema } from '@openpeepshq/common/types';
import type { RequestEvent } from '@riddl/core';
import { ensureGroupCapabilities, ensureLocalProfile } from '#lib/auth';
import { forbidden, notFound } from '#lib/errors';
import { addMembersToGroup, findGroup } from '@openpeepshq/core/groups';
import { successResponseSchema } from '@openpeepshq/common/types';
import { hub } from '@openpeepshq/core/events';

export const Output = successResponseSchema;
export const Param = z.object({
  groupId: z.string(),
});
export const Input = publicProfileSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Param, Input, Output }).handle(
  async (params, event: RequestEvent) => {
    const profile = await ensureLocalProfile(event);

    const group = await findGroup(params.groupId);

    if (!group) {
      throw notFound();
    }

    await ensureGroupCapabilities(event, ['core-groups-addMember'], group);

    const addedProfile = publicProfileSchema.parse(params);

    await addMembersToGroup(group, [addedProfile]);

    await hub.emit('groupMemberAdded', group, addedProfile, profile);

    return { success: true };
  },
);
