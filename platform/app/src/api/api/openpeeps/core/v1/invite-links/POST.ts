import { Endpoint } from 'sveltekit-api';
import { forbidden } from '$lib/server/api/errors';
import {
  inviteLinkDataSchema,
  inviteLinkWithMetaSchema,
} from '@openpeeps/common/types';
import { ensureRoleCapabilities } from '$lib/server/auth';
import type { RequestEvent } from '@sveltejs/kit';
import { createInviteLink } from '@openpeeps/core/inviteLinks';

export const Input = inviteLinkDataSchema;
export const Output = inviteLinkWithMetaSchema;

export const Error = {
  403: forbidden(),
};

export default new Endpoint({ Input, Output, Error }).handle(
  async (input, event: RequestEvent) => {
    const profile = await ensureRoleCapabilities(event, ['core-inviteLinks-create']);

    const inviteLinkData = inviteLinkDataSchema.parse(input);

    return createInviteLink(inviteLinkData, profile);
  },
);
