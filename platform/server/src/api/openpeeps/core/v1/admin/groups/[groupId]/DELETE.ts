import { endpoint, z } from '#lib/endpoint';
import { ensureRoleCapabilities } from '#lib/auth';
import { forbidden, notFound } from '#lib/errors';
import { successResponseSchema } from '@openpeepshq/common/types';
import { deleteGroup, findGroup } from '@openpeepshq/core/groups';
import type { RequestEvent } from '@riddl/core';

export const Output = successResponseSchema;
export const Param = z.object({
  groupId: z.string(),
});

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Param, Output, Error }).handle(
  async (param, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-groups-delete']);

    const group = await findGroup(param.groupId);
    if (!group) {
      throw notFound(`Group with id ${param.groupId}`);
    }

    await deleteGroup(group);
    return { success: true };
  },
);
