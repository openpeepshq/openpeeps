import { endpoint, z } from '#lib/endpoint';
import { successResponseSchema } from '@openpeeps/common/types';
import { forbidden, notFound } from '#lib/errors';
import { ensureRoleCapabilities } from '#lib/auth';
import { updateConfig } from '@openpeeps/core/config';

export const Param = z.object({
  namespace: z.string(),
  name: z.string(),
});
export const Input = z.object({
  config: z.any(),
});

export const Output = successResponseSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Param, Input, Output, Error }).handle(
  async (input, event) => {
    await ensureRoleCapabilities(event, ['core-config-update']);
    const { config, name, namespace } = input;
    await updateConfig(config, namespace, name);
    return { success: true };
  },
);
