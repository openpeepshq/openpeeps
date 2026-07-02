import { endpoint, z } from '#lib/endpoint';
import { forbidden, notFound } from '#lib/errors';
import { ensureLocalProfile } from '#lib/auth';
import type { RequestEvent } from '@riddl/core';
import { findGroup } from '@openpeeps/core/groups';
import { markGroupPostsSeen } from '@openpeeps/core/posts';
import { successResponseSchema } from '@openpeeps/common/types';

export const Param = z.object({
  groupId: z.string(),
});

export const Output = successResponseSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Param, Output, Error }).handle(
  async (input, event: RequestEvent) => {
    const profile = await ensureLocalProfile(event);

    const group = await findGroup(input.groupId);

    if (!group) {
      throw notFound();
    }

    const isMember = profile.memberships?.some(
      (membership) => membership.group.id === group.id,
    );

    if (!isMember) {
      throw forbidden();
    }

    await markGroupPostsSeen(event.context.authData, group.id);

    return { success: true };
  },
);
