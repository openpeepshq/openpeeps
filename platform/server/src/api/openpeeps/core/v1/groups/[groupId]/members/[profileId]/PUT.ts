import { endpoint, z } from '#lib/endpoint';
import { groupRoleSchema } from '@openpeepshq/common/types';
import type { RequestEvent } from '@riddl/core';
import { ensureGroupCapabilities, ensureLocalProfile } from '#lib/auth';
import { forbidden, notFound } from '#lib/errors';
import { setMemberRoles, findGroup } from '@openpeepshq/core/groups';
import { successResponseSchema } from '@openpeepshq/common/types';
import { findProfile } from '@openpeepshq/core/profiles';

export const Output = successResponseSchema;
export const Param = z.object({
  groupId: z.string(),
  profileId: z.string(),
});
export const Input = groupRoleSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Param, Input, Output }).handle(
  async (params, event: RequestEvent) => {
    await ensureLocalProfile(event);

    const group = await findGroup(params.groupId);

    const memberProfile = await findProfile(params.profileId);

    if (!group || !memberProfile) {
      throw notFound();
    }

    await ensureGroupCapabilities(event, ['core-groups-changeMemberRole'], group);

    await setMemberRoles(memberProfile, group, params.roles);

    return { success: true };
  },
);
