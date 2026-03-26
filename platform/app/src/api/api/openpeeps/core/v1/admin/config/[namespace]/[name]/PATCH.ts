import { Endpoint, z } from 'sveltekit-api';
import { successResponseSchema } from '@openpeeps/common/types';
import { forbidden, notFound } from '$lib/server/api/errors';
import { ensureRoleCapabilities } from '$lib/server/auth';
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

export default new Endpoint({ Param, Input, Output, Error }).handle(
  async (input, event) => {
    await ensureRoleCapabilities(event, ['core-config-update']);
    const { config, name, namespace } = input;
    await updateConfig(config, namespace, name);
    return { success: true };
  },
);
