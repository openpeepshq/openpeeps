import { endpoint, z } from '#lib/endpoint';
import { groupDataSchema } from '@openpeepshq/common/types';
import type { RequestEvent } from '@riddl/core';
import { ensureGroupCapabilities } from '#lib/auth';
import { conflict, forbidden, notFound } from '#lib/errors';
import { findGroup, findGroupByHandle, updateGroup } from '@openpeepshq/core/groups';
import { groupWithMetaSchema } from '@openpeepshq/common/types';
import { findProfileByHandle } from '@openpeepshq/core/profiles';

export const Output = groupWithMetaSchema;
export const Param = z.object({
  groupId: z.string(),
});
export const Input = groupDataSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Param, Input, Output }).handle(
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
