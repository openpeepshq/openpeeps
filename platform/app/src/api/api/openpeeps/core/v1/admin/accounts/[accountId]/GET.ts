import { Endpoint, z } from 'sveltekit-api';
import {
  publicAccountSchema,
  type PublicAccount,
} from '@openpeeps/common/types';
import { forbidden, notFound } from '$lib/server/api/errors';
import { findAccount } from '@openpeeps/core/accounts';
import type { RequestEvent } from '@sveltejs/kit';
import { ensureRoleCapabilities } from '$lib/server/auth';

export const Param = z.object({
  accountId: z.string(),
});
export const Output = publicAccountSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export default new Endpoint({ Param, Output, Error }).handle(
  async (param, event: RequestEvent): Promise<PublicAccount> => {
    await ensureRoleCapabilities(event, ['core-accounts-read']);

    const requestedAccount = await findAccount(param.accountId);
    if (!requestedAccount) {
      throw notFound(`Account with id ${param.accountId}`);
    }

    return publicAccountSchema.parse(requestedAccount);
  },
);
