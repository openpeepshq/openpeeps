import { Endpoint } from 'sveltekit-api';
import { conflict, forbidden } from '$lib/server/api/errors';
import {
  groupDataSchema,
  groupWithMetaSchema,
  publicProfileSchema,
} from '@openpeeps/common/types';
import { ensureRoleCapabilities } from '$lib/server/auth';
import type { RequestEvent } from '@sveltejs/kit';
import { createGroup, findGroupByHandle } from '@openpeeps/core/groups';
import { createGroupRequestSchema } from '@openpeeps/common/types';
import { findProfileByHandle } from '@openpeeps/core/profiles';


export const Input = createGroupRequestSchema;
export const Output = groupWithMetaSchema;

export const Error = {
  403: forbidden(),
  409: conflict()
};

export default new Endpoint({ Input, Output, Error }).handle(
  async (input, event: RequestEvent) => {
    const profile = await ensureRoleCapabilities(event, ['core-groups-create']);
    const groupData = groupDataSchema.parse(input);

    if (await findGroupByHandle(groupData.handle) || await findProfileByHandle(groupData.handle)) {
      throw conflict('groups.handleExists');
    }
    const members = publicProfileSchema.array().optional().parse(input.members);

    return createGroup(groupData, profile, members);
  },
);
