import { endpoint, z } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import { notFound } from '#lib/errors';
import { ensureRoleCapabilities } from '#lib/auth';
import { listProfiles } from '@openpeepshq/core/profiles';
import { profileWithMetaSchema } from '@openpeepshq/common/types';

export const Output = z.array(profileWithMetaSchema);
export const Param = z.object({
  accountId: z.string(),
});

export const Error = {
  404: notFound(),
};

export const apiEndpoint = endpoint({ Output, Param }).handle(
  async (param, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-accounts-list']);

    return listProfiles();
  },
);
