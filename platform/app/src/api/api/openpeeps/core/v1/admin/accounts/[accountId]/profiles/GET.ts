import { Endpoint, z } from 'sveltekit-api';
import type { RequestEvent } from '@sveltejs/kit';
import { notFound } from '$lib/server/api/errors';
import { ensureRoleCapabilities } from '$lib/server/auth';
import { listProfiles } from '@openpeeps/core/profiles';
import { profileWithMetaSchema } from '@openpeeps/common/types';

export const Output = z.array(profileWithMetaSchema);
export const Param = z.object({
  accountId: z.string(),
});

export const Error = {
  404: notFound(),
};

export default new Endpoint({ Output, Param }).handle(
  async (param, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-accounts-list']);

    return listProfiles();
  },
);
