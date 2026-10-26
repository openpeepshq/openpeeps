import { endpoint, z } from '#lib/endpoint';
import { badRequest, forbidden, notFound } from '#lib/errors';
import {
  findInviteLink,
  updateInviteLink,
} from '@openpeepshq/core/inviteLinks';
import { inviteLinkWithMetaSchema } from '@openpeepshq/common/types';
import { ensureRoleCapabilities } from '#lib/auth';

export const Param = z.object({
  inviteLinkId: z.string(),
});

export const Input = z.object({
  maxUses: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional(),
});

export const Output = inviteLinkWithMetaSchema;

export const Error = {
  400: badRequest(),
  403: forbidden(),
  404: notFound(),
};

type UpdateInviteLinkInput = {
  inviteLinkId: string;
  maxUses?: number;
  expiresAt?: string;
};

export const apiEndpoint = endpoint({ Param, Input, Output, Error }).handle(
  async (input: UpdateInviteLinkInput, event) => {
    await ensureRoleCapabilities(event, ['core-inviteLinks-update']);

    const inviteLink = await findInviteLink(input.inviteLinkId);

    if (!inviteLink) {
      throw notFound();
    }

    if (input.maxUses == null && input.expiresAt == null) {
      throw badRequest('maxUses or expiresAt is required');
    }

    // A cap below redemptions already recorded cannot be used and makes the
    // uses column look over-spent.
    if (
      input.maxUses != null &&
      input.maxUses < (inviteLink.redemptions?.length ?? 0)
    ) {
      throw badRequest(
        'Number of uses cannot be lower than the number of accounts that already joined',
      );
    }

    return updateInviteLink(inviteLink.id, {
      ...(input.maxUses != null ? { maxUses: input.maxUses } : {}),
      ...(input.expiresAt != null ? { expiresAt: input.expiresAt } : {}),
    });
  },
);
