import { endpoint, z } from '#lib/endpoint';
import {
  publicAccountSchema,
  type PublicAccount,
} from '@openpeepshq/common/types';
import { forbidden, notFound } from '#lib/errors';
import { findAccount } from '@openpeepshq/core/accounts';
import type { RequestEvent } from '@riddl/core';
import { ensureRoleCapabilities } from '#lib/auth';

export const Param = z.object({
  accountId: z.string(),
});
export const Output = publicAccountSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Param, Output, Error }).handle(
  async (param, event: RequestEvent): Promise<PublicAccount> => {
    await ensureRoleCapabilities(event, ['core-accounts-read']);

    const requestedAccount = await findAccount(param.accountId);
    if (!requestedAccount) {
      throw notFound(`Account with id ${param.accountId}`);
    }

    return publicAccountSchema.parse(requestedAccount);
  },
);
