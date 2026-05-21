import { Endpoint } from 'sveltekit-api';
import type { RequestEvent } from '@sveltejs/kit';
import {
  accessTokenCreationDataSchema,
  accessTokenSchema,
} from '@openpeeps/common/types';
import { createSignedServiceToken } from '@openpeeps/core/accessTokens';
import { forbidden } from '$lib/server/api/errors';
import { ensureRoleCapabilities } from '$lib/server/auth';

export const Input = accessTokenCreationDataSchema;
export const Output = accessTokenSchema;

export const Error = {
  403: forbidden(),
};

export default new Endpoint({ Input, Output, Error }).handle(
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
