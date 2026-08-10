import { ensureAccount } from '#lib/auth';
import type {
  RequestResetPasswordRequest,
  ResetPasswordRequest,
  SuccessResponse,
} from '@openpeepshq/common/types';
import { notFound } from '#lib/errors';
import {
  findAccountByEmail,
  sendResetPasswordEmail,
  updateAccount,
} from '@openpeepshq/core/accounts';
import type { RequestEvent } from '@riddl/core';

export const requestResetPasswordHandler = async (
  request: RequestResetPasswordRequest,
): Promise<SuccessResponse> => {
  const lowerCaseRequestEmail = request.email.toLowerCase();
  const account = await findAccountByEmail(lowerCaseRequestEmail);

  if (!account) {
    throw notFound(`Account with email ${lowerCaseRequestEmail}`);
  }

  await sendResetPasswordEmail(account);

  return { success: true };
};

export const resetPasswordHandler = async (
  request: ResetPasswordRequest,
  event: RequestEvent,
) => {
  const account = ensureAccount(event);

  await updateAccount({
    account,
    password: request.password,
  });

  return { success: true } as SuccessResponse;
};
