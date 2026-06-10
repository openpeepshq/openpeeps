import { endpoint } from '#lib/endpoint';
import { authNeeded, forbidden } from '#lib/errors';
import { publicAccountSchema, type PublicAccount } from '@openpeeps/common/types';
import { ensureAccount } from '#lib/auth';
import type { RequestEvent } from '@riddl/core';

export const Output = publicAccountSchema;

export const Error = {
  403: forbidden(),
  401: authNeeded(),
};

export const apiEndpoint = endpoint({ Output, Error }).handle(
  async (
    _: unknown,
    event: RequestEvent,
  ): Promise<PublicAccount> => publicAccountSchema.parse(ensureAccount(event)) as PublicAccount
);
