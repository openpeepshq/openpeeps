import { endpoint, z } from '#lib/endpoint';
import { successResponseSchema } from '@openpeepshq/common/types';
import { forbidden } from '#lib/errors';
import { ensureRoleCapabilities } from '#lib/auth';
import { reloadPlugins } from '#lib/pluginReload';

export const Output = successResponseSchema;

export const Error = {
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Output, Error }).handle(
  async (_input, event) => {
    await ensureRoleCapabilities(event, ['core-plugins-manage']);
    await reloadPlugins();
    return { success: true };
  },
);
