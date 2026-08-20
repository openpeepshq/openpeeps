import { CoreEventKey, CoreEvents, hub, VALID_EVENT_KEYS } from '../events';
import { defaultConfig, registerConfigSchema } from '../config';

import type { PackageJson } from 'type-fest';
import type { Plugin, PluginManifest } from '@openpeepshq/common';
import { pluginManifestSchema } from '@openpeepshq/common';
import {
  enumeratePluginInfos,
  enumerateReferencedPluginInfos,
  isPluginEnabled,
  sortByDependencies,
} from './helpers';
import { getPluginStateOverrides } from './state';
import { logger } from '../log';

export * from './pluginAuth';
export * from './state';
export * from './install';

const log = logger('core:plugins');

interface EventHandler {
  (...args: unknown[]): void;
}

let initialized = false;
const loadedPlugins = new Map<string, Plugin>();
const loadedModules = new Map<string, unknown>();
const pluginManifests = new Map<string, PluginManifest>();
const pluginUnsubscribers = new Map<string, (() => void)[]>();

export const getPlugins = (): Plugin[] => Array.from(loadedPlugins.values());

export const getPluginModule = (key: string): unknown | undefined =>
  loadedModules.get(key);

export const getPluginManifests = (): Record<string, PluginManifest> =>
  Object.fromEntries(pluginManifests.entries());

const clearPluginState = () => {
  for (const unsubscribers of pluginUnsubscribers.values()) {
    for (const unsub of unsubscribers) {
      unsub();
    }
  }
  loadedPlugins.clear();
  loadedModules.clear();
  pluginManifests.clear();
  pluginUnsubscribers.clear();
  initialized = false;
};

export const initializePlugins = async () => {
  if (initialized) {
    return;
  }

  const {
    plugins: { path: pluginsPath, rootPackageJsonPath },
  } = await defaultConfig;
  const stateOverrides = await getPluginStateOverrides();

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

    const plugin: Plugin = {
      key,
      namespace,
      name,
      info,
      path: pluginPath,
    };

    // DB override (set via the admin toggle) takes precedence over the
    // static `openpeeps.enabled` package.json gate; a missing override
    // falls back to the static gate.
    const enabled = stateOverrides[key] ?? isPluginEnabled(info);

    if (!enabled) {
      log.info(`Skipping disabled plugin "${displayName}" (key: ${key}).`);
      plugin.status = 'disabled';
      loadedPlugins.set(key, plugin);
      return;
    }

    log.info(
      `Loading plugin "${displayName}" (key: ${key}) from path ${pluginPath}.`,
    );

    try {
      const pluginModule = await import(
        /* @vite-ignore */ `${pluginPath}/dist/index.js`
      );
      loadedModules.set(key, pluginModule);

      if ('interceptors' in pluginModule) {
        const interceptors: Partial<CoreEvents> =
          await pluginModule.interceptors();
        const unsubscribers: (() => void)[] = [];
        for (const [eventKey, handler] of Object.entries(interceptors)) {
          if (!VALID_EVENT_KEYS.includes(eventKey as CoreEventKey)) {
            log.warn(
              `${plugin.key} registered handler for unknown event ${eventKey}. Skipping.`,
            );
            continue;
          }
          log.info(`${plugin.key} listening for event ${eventKey}`);
          const unsub = hub.on(eventKey as CoreEventKey, async (...args) => {
            try {
              await (handler as EventHandler)(...args);
            } catch (e) {
              log.error(
                e,
                `${plugin.key} handler for event ${eventKey} failed.`,
              );
            }
          });
          unsubscribers.push(unsub);
        }
        pluginUnsubscribers.set(key, unsubscribers);
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

export const reloadPlugins = async () => {
  log.info('Reloading all plugins...');
  clearPluginState();
  const result = await initializePlugins();
  log.info('Plugin reload complete.');
  return result;
};
