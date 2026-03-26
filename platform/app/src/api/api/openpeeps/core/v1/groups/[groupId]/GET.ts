import { Endpoint, z } from 'sveltekit-api';
import { groupWithMetaSchema } from '@openpeeps/common/types';
import { findGroup } from '@openpeeps/core/groups';
import { ensureGroupCapabilities } from '$lib/server/auth';
import { notFound } from '$lib/server/api/errors';

export const Output = groupWithMetaSchema;
export const Param = z.object({
  groupId: z.string(),
});
export default new Endpoint({ Param, Output }).handle(async (params, event) => {
  const group = await findGroup(params.groupId);

  if (!group) {
    throw notFound(`group with id ${params.groupId} not found`);
  }

  await ensureGroupCapabilities(event, ['core-groups-read'], group);

  return group;
});
