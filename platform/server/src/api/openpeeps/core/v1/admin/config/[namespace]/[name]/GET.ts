import { endpoint, z } from '#lib/endpoint';
import { forbidden, notFound } from '#lib/errors';
import { ensureRoleCapabilities } from '#lib/auth';
import { sanitizedConfigWithDefaults } from '@openpeepshq/core/config';
import { configDataWithDefaultsSchema } from '@openpeepshq/common/types';

export const Param = z.object({
  namespace: z.string(),
  name: z.string(),
});
export const Output = configDataWithDefaultsSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Param, Output, Error }).handle(
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
