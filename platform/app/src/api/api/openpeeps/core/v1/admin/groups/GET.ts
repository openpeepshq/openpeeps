import { Endpoint } from 'sveltekit-api';
import { groupWithMetaSchema } from '@openpeeps/common/types';
import type { RequestEvent } from '@sveltejs/kit';
import { forbidden } from '$lib/server/api/errors';
import { ensureRoleCapabilities } from '$lib/server/auth';
import { listAllGroups } from '@openpeeps/core/groups';

export const Output = groupWithMetaSchema.array();

export const Error = {
  403: forbidden(),
};

export default new Endpoint({ Error, Output }).handle(
  async (_, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-groups-read']);

    return await listAllGroups()
  },
);
