import { endpoint, z } from '#lib/endpoint';
import {
  groupDataSchema,
  groupWithMetaSchema,
} from '@openpeepshq/common/types';
import type { RequestEvent } from '@riddl/core';
import { ensureGroupCapabilities } from '#lib/auth';
import {
  conflict,
  forbidden,
  notFound,
  unprocessableRequest,
} from '#lib/errors';
import { assertHandleAllowed } from '#lib/forbiddenHandles';
import {
  findGroup,
  findGroupByHandle,
  updateGroup,
} from '@openpeepshq/core/groups';
import { findProfileByHandle } from '@openpeepshq/core/profiles';

export const Output = groupWithMetaSchema;
export const Param = z.object({
  groupId: z.string(),
});
export const Input = groupDataSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
  422: unprocessableRequest(),
};

const capabilitiesChanged = (current: unknown, next: unknown) =>
  JSON.stringify(current ?? {}) !== JSON.stringify(next ?? {});

export const apiEndpoint = endpoint({ Param, Input, Output }).handle(
  async (params, event: RequestEvent) => {
    const group = await findGroup(params.groupId);

    if (!group) {
      throw notFound();
    }

    await ensureGroupCapabilities(event, ['core-groups-update'], group);

    const groupData = groupDataSchema.parse(params);

    if (capabilitiesChanged(group.capabilities, groupData.capabilities)) {
      await ensureGroupCapabilities(
        event,
        ['core-groups-updateCapabilities'],
        group,
      );
    }

    if (group.handle !== groupData.handle) {
      await assertHandleAllowed(groupData.handle);
      if (
        (await findGroupByHandle(groupData.handle)) ||
        (await findProfileByHandle(groupData.handle))
      ) {
        throw conflict('groups.handleExists');
      }
    }

    return await updateGroup(group, groupData);
  },
);
