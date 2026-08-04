import { deepmergeCustom } from 'deepmerge-ts';
import {
  ConfigTree,
  ConfigSchema,
  CoreConfig,
  coreConfigSchemaFactory,
  communityConfigSchemaFactory,
  CommunityConfig,
  ConfigSchemaFactory,
  CapabilitiesConfig,
  capabilitiesConfigSchemaFactory,
} from '@openpeeps/common/types';

import { zodDeepPartialSchema } from '../lib/zodDeepPartial';

import { defaultConfig } from './defaults/core';
import { defaultCommunityConfig } from './defaults/community';
import { default as logsConfig } from './defaults/logs';
import { default as dbConfig } from './defaults/db';
import { hub } from '../events';
import { loadConfig, storeConfig } from './db';
import { defaultCapabilitiesConfig } from './defaults/capabilities';
import { pruneEmptyConfigStrings } from './pruneEmptyConfigStrings';

export { defaultConfig, defaultCommunityConfig, logsConfig, dbConfig };
export { pruneEmptyConfigStrings } from './pruneEmptyConfigStrings';

const deepmerge = deepmergeCustom({
  mergeArrays: (values) => values[1],
});
const configPromises = new Map<string, Promise<ConfigTree>>();
const configSchemaRegistry = new Map<string, ConfigSchema<unknown>>();

const configKey = (namespace: string, name: string) => `${namespace}-${name}`;

export const hasConfigSchema = (namespace: string, name: string) =>
  configSchemaRegistry.has(configKey(namespace, name));

export const registerConfigSchema = <T>(
  namespace: string,
  name: string,
  factory: ConfigSchemaFactory<T>,
  defaults: T,
) =>
  configSchemaRegistry.set(configKey(namespace, name), {
    factory,
    defaults,
  });

registerConfigSchema(
  'openpeeps',
  'core',
  coreConfigSchemaFactory,
  defaultConfig,
);
registerConfigSchema(
  'openpeeps',
  'community',
  communityConfigSchemaFactory,
  defaultCommunityConfig,
);
registerConfigSchema(
  'openpeeps',
  'capabilities',
  capabilitiesConfigSchemaFactory,
  defaultCapabilitiesConfig,
);

const initConfig = async <T = CoreConfig>(
  namespace: string,
  name: string,
): Promise<T> => {
  const key = configKey(namespace, name);

  const customConfigDocument = await loadConfig(key);

  const { defaults, factory } =
    configSchemaRegistry.get(configKey(namespace, name)) || {};

  if (!factory) {
    throw new Error(`No config registered for ${key}`);
  }

  const customConfig =
    customConfigDocument?.config &&
    zodDeepPartialSchema(factory()).parse(
      pruneEmptyConfigStrings(customConfigDocument.config),
    );

  return (
    customConfig ? deepmerge(defaults as T, customConfig) : defaults
  ) as T;
};

export const refreshConfig = (namespace = 'openpeeps', name = 'core') => {
  configPromises.set(configKey(namespace, name), initConfig(namespace, name));
};

/** Full-document write. Prefer `updateConfigValues` for patches. */
const replaceStoredConfig = (
  config: unknown,
  namespace = 'openpeeps',
  name = 'core',
) =>
  storeConfig(configKey(namespace, name), {
    config: pruneEmptyConfigStrings(config),
  })
    .then(() => refreshConfig(namespace, name))
    .then(() => hub.emit('configUpdated', namespace, name));

/**
 * Merge a sparse patch into the stored config overrides.
 * Callers must use this (not a full replace) so unrelated keys survive —
 * admin UI forms and pin/unpin all send partial trees.
 */
export const updateConfigValues = (
  configValues: unknown,
  namespace = 'openpeeps',
  name = 'core',
) =>
  loadConfig(configKey(namespace, name)).then((configDocument) =>
    replaceStoredConfig(
      deepmerge(configDocument?.config ?? {}, configValues),
      namespace,
      name,
    ),
  );

export const config = <T = CoreConfig>(
  namespace = 'openpeeps',
  name = 'core',
) => {
  const key = configKey(namespace, name);

  // Integration suites restore backups while the process is running; skip the
  // in-memory cache so config always reflects the current DB.
  if (process.env.DISABLE_CONFIG_CACHE === 'true') {
    return initConfig(namespace, name) as Promise<T>;
  }

  if (!configPromises.has(key)) {
    configPromises.set(key, initConfig(namespace, name));
  }
  return configPromises.get(key) as Promise<T>;
};

export const communityConfig = () =>
  config<CommunityConfig>('openpeeps', 'community');

export const capabilitiesConfig = (): Promise<CapabilitiesConfig> =>
  config<CapabilitiesConfig>('openpeeps', 'capabilities').then(
    (loaded) =>
      ({
        ...loaded,
        accessToken: deepmerge(
          defaultCapabilitiesConfig.accessToken ?? {},
          loaded.accessToken ?? {},
        ),
      }) as CapabilitiesConfig,
  );

export const sanitizedConfigWithDefaults = async <T = CoreConfig>(
  namespace = 'openpeeps',
  name = 'core',
) => {
  const key = configKey(namespace, name);
  const { defaults, factory } = configSchemaRegistry.get(key) ?? {};
  const sanitizedSchema = factory && factory(true);

  return {
    config: sanitizedSchema?.parse(await config<T>(namespace, name)),
    defaults: sanitizedSchema?.parse(defaults),
  };
};
