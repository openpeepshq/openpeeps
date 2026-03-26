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

import { ZodObject } from 'zod';

import { defaultConfig } from './defaults/core';
import { defaultCommunityConfig } from './defaults/community';
import { default as logsConfig } from './defaults/logs';
import { default as dbConfig } from './defaults/db';
import { hub } from '../events';
import { loadConfig, storeConfig } from './db';
import { defaultCapabilitiesConfig } from './defaults/capabilities';

export { defaultConfig, defaultCommunityConfig, logsConfig, dbConfig };

const deepmerge = deepmergeCustom({
  mergeArrays: (values) => values[1],
});
const configPromises = new Map<string, Promise<ConfigTree>>();
const configSchemaRegistry = new Map<string, ConfigSchema<unknown>>();

const configKey = (namespace: string, name: string) => `${namespace}-${name}`;

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

registerConfigSchema('allpeep', 'core', coreConfigSchemaFactory, defaultConfig);
registerConfigSchema(
  'allpeep',
  'community',
  communityConfigSchemaFactory,
  defaultCommunityConfig,
);
registerConfigSchema('allpeep', 'capabilities', capabilitiesConfigSchemaFactory, defaultCapabilitiesConfig);

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
    (factory() as ZodObject<never>)
      .deepPartial()
      .parse(customConfigDocument?.config);

  return (customConfig ? deepmerge(defaults as T, customConfig) : defaults) as T;
};

export const refreshConfig = (namespace = 'allpeep', name = 'core') => {
  configPromises.set(configKey(namespace, name), initConfig(namespace, name));
};

export const updateConfig = (
  config: unknown,
  namespace = 'allpeep',
  name = 'core',
) =>
  storeConfig(configKey(namespace, name), { config })
    .then(() => refreshConfig(namespace, name))
    .then(() => hub.emit('configUpdated', namespace, name));

export const updateConfigValues = (
  configValues: unknown,
  namespace = 'allpeep',
  name = 'core',
) =>
  loadConfig(configKey(namespace, name))
    .then((configDocument) =>
      updateConfig(deepmerge(configDocument?.config ?? {}, configValues)),
    );

export const config = <T = CoreConfig>(
  namespace = 'allpeep',
  name = 'core',
) => {
  const key = configKey(namespace, name);

  if (!configPromises.has(key)) {
    configPromises.set(key, initConfig(namespace, name));
  }
  return configPromises.get(key) as Promise<T>;
};

export const communityConfig = () =>
  config<CommunityConfig>('allpeep', 'community');

export const capabilitiesConfig = () =>
  config<CapabilitiesConfig>('allpeep', 'capabilities');

export const sanitizedConfigWithDefaults = async <T = CoreConfig>(
  namespace = 'allpeep',
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
