import { Endpoint, z } from 'sveltekit-api';
import { groupDataSchema } from '@openpeeps/common/types';
import type { RequestEvent } from '@sveltejs/kit';
import { ensureGroupCapabilities } from '$lib/server/auth';
import { conflict, forbidden, notFound } from '$lib/server/api/errors';
import { findGroup, findGroupByHandle, updateGroup } from '@openpeeps/core/groups';
import { groupWithMetaSchema } from '@openpeeps/common/types';
import { findProfileByHandle } from '@openpeeps/core/profiles';

export const Output = groupWithMetaSchema;
export const Param = z.object({
  groupId: z.string(),
});
export const Input = groupDataSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export default new Endpoint({ Param, Input, Output }).handle(
  async (params, event: RequestEvent) => {
    const group = await findGroup(params.groupId);

    if (!group) {
      throw notFound();
    }

    ensureGroupCapabilities(event, ['core-groups-update'], group);

    const groupData = groupDataSchema.parse(params);

    if (group.handle !== groupData.handle && (await findGroupByHandle(groupData.handle) || await findProfileByHandle(groupData.handle))) {
      throw conflict('groups.handleExists');
    }

    return await updateGroup(group, groupData);
  },
);
