import { Endpoint } from 'sveltekit-api';
import { forbidden, notFound } from '$lib/server/api/errors';
import { inviteLinkWithMetaSchema } from '@openpeeps/common/types';
import type { RequestEvent } from '@sveltejs/kit';
import { listInviteLinks } from '@openpeeps/core/inviteLinks';
import { ensureRoleCapabilities } from '$lib/server/auth';

export const Output = inviteLinkWithMetaSchema.array();
export const Error = {
  403: forbidden(),
  404: notFound(),
};

export default new Endpoint({ Output }).handle(
  async (params, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-inviteLinks-read']);

    return await listInviteLinks();
  },
);
