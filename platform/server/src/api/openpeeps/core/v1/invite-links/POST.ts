import { endpoint } from '#lib/endpoint';
import { forbidden } from '#lib/errors';
import {
  inviteLinkDataSchema,
  inviteLinkWithMetaSchema,
} from '@openpeeps/common/types';
import { ensureRoleCapabilities } from '#lib/auth';
import type { RequestEvent } from '@riddl/core';
import { createInviteLink } from '@openpeeps/core/inviteLinks';

export const Input = inviteLinkDataSchema;
export const Output = inviteLinkWithMetaSchema;

export const Error = {
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Input, Output, Error }).handle(
  async (input, event: RequestEvent) => {
    const profile = await ensureRoleCapabilities(event, ['core-inviteLinks-create']);

    const inviteLinkData = inviteLinkDataSchema.parse(input);

    return createInviteLink(inviteLinkData, profile);
  },
);
