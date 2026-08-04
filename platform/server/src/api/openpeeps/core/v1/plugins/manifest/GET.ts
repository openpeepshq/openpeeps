import { endpoint, z } from '#lib/endpoint';
import { pluginManifestSchema } from '@openpeeps/common/types';
import { getPlugins, getPluginManifests } from '@openpeeps/core/plugins';

const manifestEntrySchema = pluginManifestSchema
  .extend({
    key: z.string(),
    namespace: z.string(),
    name: z.string(),
  })
  // The manifest was already validated by pluginManifestSchema.parse() when the
  // plugin was loaded, so additional unknown keys are harmless here.
  .passthrough();

export const Output = z.array(manifestEntrySchema);

export const apiEndpoint = endpoint({ Output }).handle(async () => {
  const plugins = getPlugins();
  const manifests = getPluginManifests();

  return plugins.map((plugin) =>
    manifestEntrySchema.parse({
      key: plugin.key,
      namespace: plugin.namespace,
      name: plugin.name,
      ...manifests[plugin.key],
    }),
  );
});
