import { endpoint } from '#lib/endpoint';
import { authNeeded, forbidden } from '#lib/errors';
import {
  accountExportSchema,
  type AccountExport,
} from '@openpeepshq/common/types';
import { ensureAccount } from '#lib/auth';
import type { RequestEvent } from '@riddl/core';

export const Output = accountExportSchema;

export const Error = {
  403: forbidden(),
  401: authNeeded(),
};

export const apiEndpoint = endpoint({ Output, Error }).handle(
  async (_: unknown, event: RequestEvent): Promise<AccountExport> => {
    const account = ensureAccount(event);
    return accountExportSchema.parse(account);
  },
);
