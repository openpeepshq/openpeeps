import { CoreEventKey, CoreEvents, hub, VALID_EVENT_KEYS } from '../events';
import { defaultConfig, registerConfigSchema } from '../config';

import type { PackageJson } from 'type-fest';
import type { Plugin, PluginManifest } from '@openpeepshq/common';
import { pluginManifestSchema } from '@openpeepshq/common';
import {
  enumeratePluginInfos,
  enumerateReferencedPluginInfos,
  sortByDependencies,
} from './helpers';
import { logger } from '../log';

export * from './pluginAuth';

const log = logger('core:plugins');

interface EventHandler {
  (...args: unknown[]): void;
}

let initialized = false;
const loadedPlugins = new Map<string, Plugin>();
const loadedModules = new Map<string, unknown>();
const pluginManifests = new Map<string, PluginManifest>();

export const getPlugins = (): Plugin[] => Array.from(loadedPlugins.values());

export const getPluginModule = (key: string): unknown | undefined =>
  loadedModules.get(key);

export const getPluginManifests = (): Record<string, PluginManifest> =>
  Object.fromEntries(pluginManifests.entries());

export const initializePlugins = async () => {
  if (initialized) {
    return;
  }

  const {
    plugins: { path: pluginsPath, rootPackageJsonPath },
  } = await defaultConfig;

  const loadPlugin = async (
    key: string,
    info: PackageJson,
    pluginPath: string,
  ): Promise<void> => {
    const [namespace, name] = key.split('/');
    const displayName =
      typeof info?.config?.displayName === 'string'
        ? info.config.displayName
        : key;

    log.info(
      `Loading plugin "${displayName}" (key: ${key}) from path ${pluginPath}.`,
    );

    const plugin: Plugin = {
      key,
      namespace,
      name,
      info,
      path: pluginPath,
    };

    try {
      const pluginModule = await import(
        /* @vite-ignore */ `${pluginPath}/dist/index.js`
      );
      loadedModules.set(key, pluginModule);

      if ('interceptors' in pluginModule) {
        const interceptors: Partial<CoreEvents> =
          await pluginModule.interceptors();
        for (const [eventKey, handler] of Object.entries(interceptors)) {
          if (!VALID_EVENT_KEYS.includes(eventKey as CoreEventKey)) {
            log.warn(
              `${plugin.key} registered handler for unknown event ${eventKey}. Skipping.`,
            );
            continue;
          }
          log.info(`${plugin.key} listening for event ${eventKey}`);
          hub.on(eventKey as CoreEventKey, async (...args) => {
            try {
              await (handler as EventHandler)(...args);
            } catch (e) {
              log.error(
                e,
                `${plugin.key} handler for event ${eventKey} failed.`,
              );
            }
          });
        }
      }
      if ('configSchema' in pluginModule) {
        registerConfigSchema(
          namespace,
          name,
          pluginModule.configSchema.schema,
          pluginModule.configSchema.defaults,
        );
      }
      if ('manifest' in pluginModule) {
        pluginManifests.set(
          key,
          pluginManifestSchema.parse(pluginModule.manifest),
        );
      }

      plugin.status = 'loaded';
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      log.error(e, `Failed to load plugin ${key}.`);
      plugin.status = 'failed';
      plugin.error = message;
    }

    loadedPlugins.set(key, plugin);
  };

  const sortedInfos = sortByDependencies([
    ...(await enumeratePluginInfos(pluginsPath)),
    ...enumerateReferencedPluginInfos(rootPackageJsonPath),
  ]);

  for (const [key, info, pluginPath] of sortedInfos) {
    await loadPlugin(key, info, pluginPath);
  }

  initialized = true;

  return Object.fromEntries(loadedPlugins.entries());
};

export const sortedPluginInfos = async () => {
  const {
    plugins: { path: pluginsPath, rootPackageJsonPath },
  } = defaultConfig;

  return sortByDependencies([
    ...(await enumeratePluginInfos(pluginsPath)),
    ...enumerateReferencedPluginInfos(rootPackageJsonPath),
  ]);
};
