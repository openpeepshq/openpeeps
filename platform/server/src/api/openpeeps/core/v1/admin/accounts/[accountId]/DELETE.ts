import { endpoint, z } from '#lib/endpoint';
import { deleteAccount, findAccount } from '@openpeeps/core/accounts';
import type { RequestEvent } from '@riddl/core';
import { ensureRoleCapabilities } from '#lib/auth';
import { forbidden, notFound } from '#lib/errors';
import { successResponseSchema } from '@openpeeps/common/types';

export const Output = successResponseSchema;
export const Param = z.object({
  accountId: z.string(),
});

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Param, Output, Error }).handle(
  async (param, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-accounts-delete']);

    const requestedAccount = await findAccount(param.accountId);

    if (!requestedAccount) {
      throw notFound(`Profile with id ${param.accountId}`);
    }

    await deleteAccount(requestedAccount);

    return { success: true };
  },
);
