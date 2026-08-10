import { endpoint } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import {
  accessTokenCreationDataSchema,
  accessTokenSchema,
} from '@openpeepshq/common/types';
import { createSignedServiceToken } from '@openpeepshq/core/accessTokens';
import { forbidden } from '#lib/errors';
import { ensureRoleCapabilities } from '#lib/auth';

export const Input = accessTokenCreationDataSchema;
export const Output = accessTokenSchema;

export const Error = {
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Input, Output, Error }).handle(
  async (input, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-serviceTokens-create']);
    return createSignedServiceToken({
      name: input.name,
      description: input.description,
      scopes: input.scopes ?? [],
      expirationTime: input.expirationTime,
    });
  },
);
