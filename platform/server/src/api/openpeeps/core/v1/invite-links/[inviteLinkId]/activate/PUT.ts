import { endpoint, z } from '#lib/endpoint';
import { forbidden, notFound } from '#lib/errors';
import { findInviteLink, updateInviteLink } from '@openpeepshq/core/inviteLinks';
import { successResponseSchema } from '@openpeepshq/common/types';
import { ensureRoleCapabilities } from '#lib/auth';

export const Output = successResponseSchema;
export const Param = z.object({
  inviteLinkId: z.string(),
});
export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Param, Output, Error }).handle(async (param, event) => {

  await ensureRoleCapabilities(event, ['core-inviteLinks-update']);

  const inviteLink = await findInviteLink(param.inviteLinkId);

  if (!inviteLink) {
    throw notFound();
  }

  await updateInviteLink(inviteLink.id, {
    ...inviteLink,
    active: true,
  });

  return {
    success: true,
  };
});
