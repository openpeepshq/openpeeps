import { endpoint, z } from '#lib/endpoint';
import {
  accountDataSchema,
  publicAccountSchema,
  type PublicAccount,
} from '@openpeeps/common/types';
import { forbidden, notFound } from '#lib/errors';
import { findAccount, updateAccount } from '@openpeeps/core/accounts';
import type { RequestEvent } from '@riddl/core';
import { ensureRoleCapabilities } from '#lib/auth';

export const Param = z.object({
  accountId: z.string(),
});
export const Input = accountDataSchema.partial();
export const Output = publicAccountSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Param, Input, Output, Error }).handle(
  async (input, event: RequestEvent): Promise<PublicAccount> => {
    await ensureRoleCapabilities(event, ['core-accounts-update']);

    const requestedAccount = await findAccount(input.accountId);
    if (!requestedAccount) {
      throw notFound(`Account with id ${input.accountId}`);
    }

    const { account } = await updateAccount({
      account: requestedAccount,
      email: input.email,
      emailValidated: input.emailValidated,
    });

    if (!account) {
      throw notFound(`Account with id ${input.accountId}`);
    }

    return publicAccountSchema.parse(account) as PublicAccount;
  },
);
