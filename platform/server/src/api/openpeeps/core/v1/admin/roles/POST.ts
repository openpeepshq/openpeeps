import { endpoint } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import { conflict, forbidden, rethrowIfOpenpeepsError } from '#lib/errors';
import { ensureRoleCapabilities } from '#lib/auth';
import { createRole } from '@openpeepshq/core/roles';
import { roleDataSchema, roleSchema } from '@openpeepshq/common/types';

// Custom roles are never "default" (built-in) roles, so `default` is not part
// of the input — it is always stored as `false`.
export const Input = roleDataSchema.omit({ default: true });

export const Output = roleSchema;

export const Error = {
  403: forbidden(),
  409: conflict(),
};

export const apiEndpoint = endpoint({ Input, Output, Error }).handle(
  async (input, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-roles-update']);

    return createRole({ ...input, default: false }).catch(
      rethrowIfOpenpeepsError,
    );
  },
);
