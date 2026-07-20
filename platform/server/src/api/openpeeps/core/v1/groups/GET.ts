import { endpoint } from '#lib/endpoint';
import { groupWithMetaSchema } from '@openpeeps/common/types';
import type { RequestEvent } from '@riddl/core';
import { listGroups } from '@openpeeps/core/groups';
import { ensureAccess } from '#lib/auth';

export const Output = groupWithMetaSchema.array();

export const apiEndpoint = endpoint({ Output }).handle(
  async (_, event: RequestEvent) => {
    await ensureAccess(event);

    return listGroups(event.context.authData);
  },
);
