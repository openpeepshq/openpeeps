import { CoreEventKey, CoreEvents, hub, VALID_EVENT_KEYS } from '../events';
import { defaultConfig, registerConfigSchema } from '../config';

import type { PackageJson } from 'type-fest';
import type {
  Plugin,
  PluginManifest,
  ProfileSettingsSchemaExport,
} from '@openpeepshq/common';
import {
  i18nResourceSchema,
  pluginManifestSchema,
} from '@openpeepshq/common';
import {
  enumeratePluginInfos,
  enumerateReferencedPluginInfos,
  isPluginEnabled,
  sortByDependencies,
} from './helpers';
import { getPluginStateOverrides } from './state';
import { logger } from '../log';
import { clearPluginLocales, registerPluginLocales } from '../i18n';

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
const profileSettingsSchemas = new Map<string, ProfileSettingsSchemaExport>();
const pluginUnsubscribers = new Map<string, (() => void)[]>();

export const registerProfileSettingsSchema = (
  key: string,
  profileSettingsSchema: ProfileSettingsSchemaExport,
) => {
  profileSettingsSchemas.set(key, profileSettingsSchema);
};

export const getProfileSettingsSchema = (key: string) =>
  profileSettingsSchemas.get(key);

export const getProfileSettingsSchemaKeys = () =>
  Array.from(profileSettingsSchemas.keys());

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
  profileSettingsSchemas.clear();
  pluginUnsubscribers.clear();
  clearPluginLocales();
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
      const profileSettingsSchema = (
        pluginModule as { profileSettingsSchema?: unknown }
      ).profileSettingsSchema;

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
      if ('locales' in pluginModule) {
        const parsed = i18nResourceSchema.safeParse(pluginModule.locales);
        if (parsed.success) {
          registerPluginLocales(key, parsed.data);
        } else {
          log.warn(
            `${plugin.key} locales export is invalid. Skipping translations.`,
          );
        }
      }
      if (
        profileSettingsSchema &&
        typeof profileSettingsSchema === 'object' &&
        'schema' in profileSettingsSchema &&
        typeof profileSettingsSchema.schema === 'function' &&
        'defaults' in profileSettingsSchema
      ) {
        registerProfileSettingsSchema(
          key,
          profileSettingsSchema as ProfileSettingsSchemaExport,
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

/** Reads package and persisted plugin state without loading plugin code. */
export const getEnabledPluginKeys = async (): Promise<string[]> => {
  try {
    const {
      plugins: { path: pluginsPath, rootPackageJsonPath },
    } = defaultConfig;
    const [stateOverrides, pluginInfos] = await Promise.all([
      getPluginStateOverrides(),
      Promise.all([
        enumeratePluginInfos(pluginsPath),
        Promise.resolve(enumerateReferencedPluginInfos(rootPackageJsonPath)),
      ]).then(([installed, referenced]) => [...installed, ...referenced]),
    ]);
    const sortedInfos = sortByDependencies(pluginInfos);
    if (sortedInfos.length !== pluginInfos.length) {
      throw new Error('Enabled plugin dependency graph is incomplete');
    }
    return sortedInfos
      .filter(([key, info]) => stateOverrides[key] ?? isPluginEnabled(info))
      .map(([key]) => key);
  } catch (error) {
    log.error(error, 'Unable to initialize enabled plugin-key registry.');
    return [];
  }
};

export const reloadPlugins = async () => {
  log.info('Reloading all plugins...');
  clearPluginState();
  const result = await initializePlugins();
  log.info('Plugin reload complete.');
  return result;
};
