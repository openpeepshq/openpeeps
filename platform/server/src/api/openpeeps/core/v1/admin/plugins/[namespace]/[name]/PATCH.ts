import { endpoint, z } from '#lib/endpoint';
import { successResponseSchema } from '@openpeepshq/common/types';
import { forbidden } from '#lib/errors';
import { ensureRoleCapabilities } from '#lib/auth';
import { setPluginEnabledOverride } from '@openpeepshq/core/plugins';

export const Param = z.object({
  namespace: z.string(),
  name: z.string(),
});

export const Input = z.object({
  enabled: z.boolean(),
});

export const Output = successResponseSchema;

export const Error = {
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Param, Input, Output, Error }).handle(
  async (input, event) => {
    await ensureRoleCapabilities(event, ['core-plugins-manage']);
    await setPluginEnabledOverride(
      `${input.namespace}/${input.name}`,
      input.enabled,
    );
    return { success: true };
  },
);
