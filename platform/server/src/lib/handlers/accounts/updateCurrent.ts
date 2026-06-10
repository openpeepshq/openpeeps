import { ensureAccount } from '#lib/auth';
import {
  type SuccessResponse,
  type UpdateAccountPasswordRequest,
} from '@openpeeps/common/types';
import type { RequestEvent } from '@riddl/core';
import { forbidden } from '#lib/errors';
import { checkPassword, updateAccount } from '@openpeeps/core/accounts';

export const updateCurrentAccountPasswordHandler = async (
  updateCurrentAccountRequest: UpdateAccountPasswordRequest,
  event: RequestEvent,
): Promise<SuccessResponse> => {
  const account = ensureAccount(event);

  if (
    updateCurrentAccountRequest.newPassword &&
    !(
      updateCurrentAccountRequest.oldPassword &&
      (await checkPassword(account, updateCurrentAccountRequest.oldPassword))
    )
  ) {
    throw forbidden('Invalid credentials');
  }

  await updateAccount({
    account,
    email: updateCurrentAccountRequest.email,
    password: updateCurrentAccountRequest.newPassword,
    emailValidated:
      updateCurrentAccountRequest.email &&
      account.email !== updateCurrentAccountRequest.email
        ? false
        : undefined,
  });

  return {
    success: true,
  };
};
