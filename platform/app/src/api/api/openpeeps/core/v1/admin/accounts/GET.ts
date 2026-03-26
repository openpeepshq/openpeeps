import { Endpoint } from 'sveltekit-api';
import { publicAccountSchema } from '@openpeeps/common/types';
import type { RequestEvent } from '@sveltejs/kit';
import { forbidden } from '$lib/server/api/errors';
import { ensureRoleCapabilities } from '$lib/server/auth';
import { listAccounts } from '@openpeeps/core/accounts';

export const Output = publicAccountSchema.array();

export const Error = {
  403: forbidden(),
};

export default new Endpoint({ Error, Output }).handle(
  async (_, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-accounts-read']);

    return listAccounts().then((rawAccounts) =>
      rawAccounts.map((ru) => publicAccountSchema.parse(ru)),
    );
  },
);
