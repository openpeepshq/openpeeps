import { Endpoint, z } from 'sveltekit-api';
import { forbidden, notFound } from '$lib/server/api/errors';
import { ensureGroupCapabilities, ensureLocalProfile } from '$lib/server/auth';
import type { RequestEvent } from '@sveltejs/kit';
import { addMembersToGroup, findGroup } from '@openpeeps/core/groups';
import { successResponseSchema } from '@openpeeps/common/types';
import { hub } from '@openpeeps/core/events';

export const Output = successResponseSchema;
export const Param = z.object({
  groupId: z.string(),
});

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export default new Endpoint({ Param, Output, Error }).handle(
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
