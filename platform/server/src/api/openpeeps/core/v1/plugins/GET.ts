import { endpoint, z } from '#lib/endpoint';
import { pluginInfoSchema } from '@openpeepshq/common/types';
import { getPlugins } from '@openpeepshq/core/plugins';

export const Output = z.array(pluginInfoSchema);

const toOptionalString = (value: unknown) =>
  value != null ? String(value) : undefined;

export const apiEndpoint = endpoint({ Output }).handle(async () => {
  const plugins = getPlugins();
  return plugins.map((plugin) =>
    pluginInfoSchema.parse({
      key: plugin.key,
      namespace: plugin.namespace,
      name: plugin.name,
      version: plugin.info.version,
      displayName: toOptionalString(plugin.info.config?.displayName),
      description: plugin.info.description,
      status: plugin.status,
    }),
  );
});
