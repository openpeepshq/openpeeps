import { endpoint } from '#lib/endpoint';
import { forbidden } from '#lib/errors';
import { ensureRoleCapabilities } from '#lib/auth';
import {
  pluginConfigItemSchema,
  pluginConfigResponseSchema,
  type PluginConfigItem,
} from '@openpeepshq/common/types';
import {
  sanitizedConfigWithDefaults,
  hasConfigSchema,
} from '@openpeepshq/core/config';
import { getPlugins } from '@openpeepshq/core/plugins';
import { logger } from '@openpeepshq/core/log';

const log = logger('server:plugins');

export const Output = pluginConfigResponseSchema;

export const Error = {
  403: forbidden(),
};

type ConfigResult =
  | {
      namespace: string;
      name: string;
      data: PluginConfigItem;
    }
  | { namespace: string; name: string; error: true };

export const apiEndpoint = endpoint({ Output, Error }).handle(
  async (_input, event) => {
    await ensureRoleCapabilities(event, ['core-config-read']);

    const plugins = getPlugins();

    const results = await Promise.all(
      plugins.map(async ({ namespace, name }): Promise<ConfigResult> => {
        try {
          if (!hasConfigSchema(namespace, name)) {
            return {
              namespace,
              name,
              data: pluginConfigItemSchema.parse({
                namespace,
                name,
                config: {},
                defaults: {},
              }),
            };
          }

          const { config: pluginConfig, defaults } =
            await sanitizedConfigWithDefaults(namespace, name);
          return {
            namespace,
            name,
            data: pluginConfigItemSchema.parse({
              namespace,
              name,
              config: pluginConfig ?? {},
              defaults: defaults ?? {},
            }),
          };
        } catch (e) {
          log.warn(
            { namespace, name, error: e },
            'Failed to load plugin config',
          );
          return { namespace, name, error: true as const };
        }
      }),
    );

    const response: Record<string, Record<string, unknown>> = {};
    for (const r of results) {
      if ('error' in r) {
        continue;
      }
      response[r.namespace] ??= {};
      response[r.namespace][r.name] = r.data;
    }

    return response;
  },
);
