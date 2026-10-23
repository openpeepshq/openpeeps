import { endpoint } from '#lib/endpoint';
import { conflict, forbidden, unprocessableRequest } from '#lib/errors';
import { assertHandleAllowed } from '#lib/forbiddenHandles';
import {
  createGroupRequestSchema,
  groupDataSchema,
  groupWithMetaSchema,
  publicProfileSchema,
} from '@openpeepshq/common/types';
import { ensureRoleCapabilities } from '#lib/auth';
import type { RequestEvent } from '@riddl/core';
import { createGroup, findGroupByHandle } from '@openpeepshq/core/groups';
import { findProfileByHandle } from '@openpeepshq/core/profiles';

export const Input = createGroupRequestSchema;
export const Output = groupWithMetaSchema;

export const Error = {
  403: forbidden(),
  409: conflict(),
  422: unprocessableRequest(),
};

export const apiEndpoint = endpoint({ Input, Output, Error }).handle(
  async (input, event: RequestEvent) => {
    const profile = await ensureRoleCapabilities(event, ['core-groups-create']);
    const groupData = groupDataSchema.parse(input);
    await assertHandleAllowed(groupData.handle);

    if (
      (await findGroupByHandle(groupData.handle)) ||
      (await findProfileByHandle(groupData.handle))
    ) {
      throw conflict('groups.handleExists');
    }
    const members = publicProfileSchema.array().optional().parse(input.members);

    return createGroup(groupData, profile, members);
  },
);
