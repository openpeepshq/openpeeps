import { endpoint, z } from '#lib/endpoint';
import { groupWithMetaSchema } from '@openpeepshq/common/types';
import { findGroup } from '@openpeepshq/core/groups';
import { ensureGroupCapabilities } from '#lib/auth';
import { notFound } from '#lib/errors';

export const Output = groupWithMetaSchema;
export const Param = z.object({
  groupId: z.string(),
});
export const Error = {
  404: notFound(),
};
export const apiEndpoint = endpoint({ Param, Output, Error }).handle(
  async (params, event) => {
    const group = await findGroup(params.groupId);

    if (!group) {
      throw notFound(`group with id ${params.groupId}`);
    }

    await ensureGroupCapabilities(event, ['core-groups-read'], group);

    return group;
  },
);
