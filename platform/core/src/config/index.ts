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
} from '@openpeepshq/common/types';
import { restorePasswordPlaceholders } from '@openpeepshq/common/lib';

import { zodDeepPartialSchema } from '../lib/zodDeepPartial';

import { defaultConfig } from './defaults/core';
import { defaultCommunityConfig } from './defaults/community';
import { default as logsConfig } from './defaults/logs';
import { default as dbConfig } from './defaults/db';
import { hub } from '../events';
import { stablePublicServerInfo } from '../server/stablePublicServerInfo';
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
  // /server/info is bucket-cached so RN clients do not remount. Drop that
  // snapshot when config changes or SSO/theme patches stay invisible.
  stablePublicServerInfo.reset();
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
  loadConfig(configKey(namespace, name)).then((configDocument) => {
    const stored = configDocument?.config ?? {};
    return replaceStoredConfig(
      deepmerge(stored, restorePasswordPlaceholders(configValues, stored)),
      namespace,
      name,
    );
  });

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

/**
 * Reads the community config straight from the DB, bypassing the in-memory
 * cache. Use for low-frequency worker-side reads where a missed pub/sub
 * invalidation is not acceptable; the cached `config()` + `configUpdated`
 * stays the default path.
 *
 * Currently used by the auto-follow designation read, which runs in the
 * worker process, whose cache is only refreshed on a redis pub/sub
 * `configUpdated` event that a worker connection can miss (connect timing,
 * a redelivery gap, or a worker restart); a fresh read keeps the designated
 * accounts on the settings the admin actually saved. Only that read is
 * fresh: the same handler's `capabilitiesConfig` follow-eligibility check
 * intentionally stays on the cached `config` path, so a future reader should
 * not "fix" that read to be fresh without a behavior change.
 */
export const communityConfigFresh = () =>
  initConfig<CommunityConfig>('openpeeps', 'community');

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
