import { endpoint } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import {
  accessTokenCreationDataSchema,
  accessTokenSchema,
} from '@openpeepshq/common/types';
import { createSignedServiceToken } from '@openpeepshq/core/accessTokens';
import { forbidden } from '#lib/errors';
import { ensureRoleCapabilities } from '#lib/auth';
import { auditAction } from '#lib/audit';

export const Input = accessTokenCreationDataSchema;
export const Output = accessTokenSchema;

export const Error = {
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Input, Output, Error }).handle(
  async (input, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-serviceTokens-create']);
    const token = await createSignedServiceToken({
      name: input.name,
      description: input.description,
      scopes: input.scopes ?? [],
      expirationTime: input.expirationTime,
    });

    if (event.context.currentProfile) {
      void auditAction(event, event.context.currentProfile, {
        action: 'accessToken.create',
        targetType: 'accessToken',
        targetId: token.id,
        targetLabel: token.name,
        metadata: { expirationTime: input.expirationTime },
      });
    }

    return token;
  },
);
