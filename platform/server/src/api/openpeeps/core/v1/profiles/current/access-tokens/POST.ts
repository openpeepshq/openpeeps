import { endpoint, z } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import {
  accessTokenCreationDataSchema,
  accessTokenWithMetaSchema,
  type Scope,
} from '@openpeepshq/common/types';
import { createSignedProfileAccessToken, findAccessToken } from '@openpeepshq/core/accessTokens';
import { forbidden } from '#lib/errors';
import { ensureLocalProfile } from '#lib/auth';

export const Input = accessTokenCreationDataSchema;

export const Output = accessTokenWithMetaSchema;

export const Error = {
  403: forbidden(),
};


export const apiEndpoint = endpoint({ Input, Output, Error }).handle(
  async (input, event: RequestEvent) => {
    const profile = await ensureLocalProfile(event);
    const account = event.context.currentAccount;
    const scopes =
      input.scopes && input.scopes.length > 0
        ? ([input.scopes[0], ...input.scopes.slice(1)] as [Scope, ...Scope[]])
        : undefined;

    const createdToken = await createSignedProfileAccessToken({
      profile,
      account,
      ...input,
      scopes,
    });
    const tokenWithMeta = await findAccessToken(createdToken.id);

    if (!tokenWithMeta?.ownedBy) {
      throw forbidden('Could not resolve access token owner');
    }

    const result: z.infer<typeof Output> = {
      ...tokenWithMeta,
      profile: tokenWithMeta.ownedBy,
    };

    return result;

  },
);
