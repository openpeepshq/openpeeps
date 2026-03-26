import {
  type SuccessResponse,
  type UpdateAccountEmailRequest,
} from '@openpeeps/common/types';
import { forbidden } from '$lib/server/api/errors';
import { findAccountByEmail, updateAccount, existsAccountByEmail } from '@openpeeps/core/accounts';
import { ensureRoleCapabilities } from '$lib/server/auth';
import type { RequestEvent } from '@sveltejs/kit';
import { conflict } from '$lib/server/api/errors';

export const updateAccountEmailHandler = async (
  updateAccountEmailRequest: UpdateAccountEmailRequest,
  event: RequestEvent,
): Promise<SuccessResponse> => {
  await ensureRoleCapabilities(event, ['allpeep-core-accounts-update']);
  if (
    !updateAccountEmailRequest.newEmail ||
    !updateAccountEmailRequest.oldEmail
  ) {
    throw forbidden('Invalid old or new email');
  }

  const account = await findAccountByEmail(updateAccountEmailRequest.oldEmail);
  if (!account) {
    throw forbidden('Invalid email. Account not found');
  }

  if (await existsAccountByEmail(updateAccountEmailRequest.newEmail)) {
    throw conflict('auth.register.emailAlreadyTaken');
  }

  await updateAccount({
    account,
    email: updateAccountEmailRequest.newEmail,
    emailValidated: false,
  });

  return {
    success: true,
  };
};
