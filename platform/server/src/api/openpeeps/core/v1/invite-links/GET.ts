import { endpoint } from '#lib/endpoint';
import { forbidden, notFound } from '#lib/errors';
import { inviteLinkWithMetaSchema } from '@openpeepshq/common/types';
import type { RequestEvent } from '@riddl/core';
import { listInviteLinks } from '@openpeepshq/core/inviteLinks';
import { ensureRoleCapabilities } from '#lib/auth';

export const Output = inviteLinkWithMetaSchema.array();
export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Output }).handle(
  async (params, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-inviteLinks-read']);

    return await listInviteLinks();
  },
);
