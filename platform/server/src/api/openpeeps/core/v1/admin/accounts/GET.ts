import { endpoint } from '#lib/endpoint';
import { publicAccountSchema } from '@openpeeps/common/types';
import type { RequestEvent } from '@riddl/core';
import { forbidden } from '#lib/errors';
import { ensureRoleCapabilities } from '#lib/auth';
import { listAccounts } from '@openpeeps/core/accounts';

export const Output = publicAccountSchema.array();

export const Error = {
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Error, Output }).handle(
  async (_, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-accounts-read']);

    return listAccounts().then((rawAccounts) =>
      rawAccounts.map((ru) => publicAccountSchema.parse(ru)),
    );
  },
);
