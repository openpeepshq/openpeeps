import { Endpoint, z } from 'sveltekit-api';
import { deleteAccount, findAccount } from '@openpeeps/core/accounts';
import type { RequestEvent } from '@sveltejs/kit';
import { ensureRoleCapabilities } from '$lib/server/auth';
import { forbidden, notFound } from '$lib/server/api/errors';
import { successResponseSchema } from '@openpeeps/common/types';

export const Output = successResponseSchema;
export const Param = z.object({
  accountId: z.string(),
});

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export default new Endpoint({ Param, Output, Error }).handle(
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
