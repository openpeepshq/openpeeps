import { endpoint } from '#lib/endpoint';
import { groupWithMetaSchema } from '@openpeeps/common/types';
import type { RequestEvent } from '@riddl/core';
import { forbidden } from '#lib/errors';
import { ensureRoleCapabilities } from '#lib/auth';
import { listAllGroups } from '@openpeeps/core/groups';

export const Output = groupWithMetaSchema.array();

export const Error = {
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Error, Output }).handle(
  async (_, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-groups-read']);

    return await listAllGroups()
  },
);
