import { endpoint } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import {
  oauthClientCreatedSchema,
  oauthClientCreationSchema,
  type OAuthClientCreation,
} from '@openpeepshq/common/types';
import { createOAuthClient } from '@openpeepshq/core/oauth';
import { ensureRoleCapabilities } from '#lib/auth';
import { badRequest, forbidden, rethrowIfOAuthError } from '#lib/errors';

export const Input = oauthClientCreationSchema;
export const Output = oauthClientCreatedSchema;

export const Error = {
  400: badRequest(),
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Input, Output, Error }).handle(
  async (input: OAuthClientCreation, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-config-update']);
    return createOAuthClient(input).catch(rethrowIfOAuthError);
  },
);
