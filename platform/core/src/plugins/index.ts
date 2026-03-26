import path from 'node:path';

import { CoreEventKey, CoreEvents, hub } from '../events';
import { defaultConfig, registerConfigSchema } from '../config';

import type { PackageJson } from 'type-fest';
import type { Plugin } from '@openpeeps/common/types';
import { enumeratePluginInfos, sortByDependencies } from './helpers';
import { logger } from '../log';

const log = logger('core:plugins');

interface EventHandler {
  (...args: unknown[]): void;
}

let initialized = false;

export const initializePlugins = async () => {
  if (initialized) {
    return;
  }

  const {
    plugins: { path: pluginsPath },
  } = await defaultConfig;

  const loadPlugin = async (
    pluginsPath: string,
    info: PackageJson,
  ): Promise<[string, Plugin]> => {
    const key = info?.name?.replace('@', '') || 'unknown/unknown';
    const [namespace, name] = key.split('/');
    const pluginPath = path.join(pluginsPath, key);

    log.info(
      `Loading plugin "${info?.config?.displayName}" (key: ${key}) from path ${pluginPath}.`,
    );

    const plugin = {
      key,
      namespace,
      name,
      info,
      path: pluginPath,
    };

    try {
      if (plugin?.info?.name) {
        const pluginModule = await import(
          /* @vite-ignore */ `${pluginPath}/dist/index.js`
        );
        if ('interceptors' in pluginModule) {
          const interceptors: Partial<CoreEvents> =
            await pluginModule.interceptors();
          for (const [eventKey, handler] of Object.entries(interceptors)) {
            log.info(`${plugin.key} listening for event ${eventKey}`);
            hub.on(eventKey as CoreEventKey, handler as EventHandler);
          }
        }
        if ('configSchema' in pluginModule) {
          registerConfigSchema(
            namespace,
            name,
            pluginModule.configSchema.fprofiley,
            pluginModule.configSchema.defaults,
          );
        }
      }
    } catch (e) {
      log.error(e, `Failed to load plugin ${key}.`);
    }

    return [key, plugin];
  };

  const pluginInfos = await enumeratePluginInfos(pluginsPath);

  initialized = true;

  return Object.fromEntries(
    await Promise.all(
      pluginInfos.map(async ([key, info]) => [
        key,
        await loadPlugin(pluginsPath, info),
      ]),
    ),
  );
};

export const sortedPluginInfos = async () => {
  const {
    plugins: { path: pluginsPath },
  } = defaultConfig;

  return sortByDependencies(await enumeratePluginInfos(pluginsPath));
};
