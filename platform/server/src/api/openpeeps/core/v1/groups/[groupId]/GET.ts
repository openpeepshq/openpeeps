import { endpoint, z } from '#lib/endpoint';
import { groupWithMetaSchema } from '@openpeeps/common/types';
import { findGroup } from '@openpeeps/core/groups';
import { ensureGroupCapabilities } from '#lib/auth';
import { notFound } from '#lib/errors';

export const Output = groupWithMetaSchema;
export const Param = z.object({
  groupId: z.string(),
});
export const apiEndpoint = endpoint({ Param, Output }).handle(async (params, event) => {
  const group = await findGroup(params.groupId);

  if (!group) {
    throw notFound(`group with id ${params.groupId} not found`);
  }

  await ensureGroupCapabilities(event, ['core-groups-read'], group);

  return group;
});
