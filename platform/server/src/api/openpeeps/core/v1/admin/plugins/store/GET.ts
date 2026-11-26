import { endpoint } from '#lib/endpoint';
import { pluginStoreCatalogSchema } from '@openpeepshq/common/types';
import { badRequest, forbidden } from '#lib/errors';
import { ensureRoleCapabilities } from '#lib/auth';
import { getPluginStoreCatalog } from '@openpeepshq/core/plugins';

export const Output = pluginStoreCatalogSchema;

export const Error = {
  400: badRequest(),
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Output, Error }).handle(
  async (_input, event) => {
    await ensureRoleCapabilities(event, ['core-plugins-manage']);
    try {
      return await getPluginStoreCatalog();
    } catch (error) {
      throw badRequest(
        error instanceof globalThis.Error ? error.message : String(error),
      );
    }
  },
);
