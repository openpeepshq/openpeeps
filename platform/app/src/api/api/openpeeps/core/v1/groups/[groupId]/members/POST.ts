import { Endpoint, z } from 'sveltekit-api';
import { publicProfileSchema } from '@openpeeps/common/types';
import type { RequestEvent } from '@sveltejs/kit';
import { ensureGroupCapabilities, ensureLocalProfile } from '$lib/server/auth';
import { forbidden, notFound } from '$lib/server/api/errors';
import { addMembersToGroup, findGroup } from '@openpeeps/core/groups';
import { successResponseSchema } from '@openpeeps/common/types';
import { hub } from '@openpeeps/core/events';

export const Output = successResponseSchema;
export const Param = z.object({
  groupId: z.string(),
});
export const Input = publicProfileSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export default new Endpoint({ Param, Input, Output }).handle(
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
