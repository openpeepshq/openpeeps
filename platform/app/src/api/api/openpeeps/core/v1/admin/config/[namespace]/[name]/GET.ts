import { Endpoint, z } from 'sveltekit-api';
import { forbidden, notFound } from '$lib/server/api/errors';
import { ensureRoleCapabilities } from '$lib/server/auth';
import { sanitizedConfigWithDefaults } from '@openpeeps/core/config';
import { configDataWithDefaultsSchema } from '@openpeeps/common/types';

export const Param = z.object({
  namespace: z.string(),
  name: z.string(),
});
export const Output = configDataWithDefaultsSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export default new Endpoint({ Param, Output, Error }).handle(
  async (input, event) => {
    await ensureRoleCapabilities(event, ['core-config-read']);

    const { name, namespace } = input;

    const _key = [name, namespace].join('-');

    return Output.parse({
      _key,
      ...(await sanitizedConfigWithDefaults(namespace, name)),
    });
  },
);
