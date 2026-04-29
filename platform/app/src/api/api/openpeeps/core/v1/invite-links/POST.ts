import { Endpoint } from 'sveltekit-api';
import { forbidden, notFound } from '$lib/server/api/errors';
import {
  inviteLinkDataSchema,
  inviteLinkWithMetaSchema,
} from '@openpeeps/common/types';
import { canAddMember } from '@openpeeps/common/lib';
import { ensureRoleCapabilities } from '$lib/server/auth';
import type { RequestEvent } from '@sveltejs/kit';
import { findGroup } from '@openpeeps/core/groups';
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

    const groupIds = inviteLinkData.groupIds?.length
      ? [...new Set(inviteLinkData.groupIds)]
      : [];
    for (const groupId of groupIds) {
      const group = await findGroup(groupId);
      if (!group) {
        throw notFound('Group');
      }
      if (!canAddMember(profile, group)) {
        throw forbidden("You are not allowed to create invite links for this group");
      }
    }

    return createInviteLink(inviteLinkData, profile);
  },
);
