import { endpoint, z } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import { ensureGroupCapabilities, ensureLocalProfile } from '#lib/auth';
import { findGroup, removeMembersFromGroup } from '@openpeeps/core/groups';
import { successResponseSchema } from '@openpeeps/common/types';
import { findProfile } from '@openpeeps/core/profiles';
import { conflict, forbidden, notFound } from '#lib/errors';
import { hub } from '@openpeeps/core/events';

export const Output = successResponseSchema;
export const Param = z.object({
  groupId: z.string(),
  profileId: z.string(),
});

export const Error = {
  409: conflict(),
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Param, Output }).handle(
  async (params, event: RequestEvent) => {
    const profile = await ensureLocalProfile(event);

    if (profile.id === params.profileId) {
      throw conflict();
    }
    const group = await findGroup(params.groupId);

    if (!group) {
      throw notFound();
    }

    const profileToDelete = await findProfile(params.profileId);

    if (!profileToDelete) {
      throw notFound();
    }

    await ensureGroupCapabilities(event, ['core-groups-removeMember'], group);

    await removeMembersFromGroup(group, [profileToDelete]);

    await hub.emit('groupMemberRemoved', group, profileToDelete, profile);

    return { success: true };
  },
);
