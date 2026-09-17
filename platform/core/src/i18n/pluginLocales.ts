import { deepmerge } from 'deepmerge-ts';
import type { Resource } from 'i18next';

const pluginLocaleRegistry = new Map<string, Resource>();

export const registerPluginLocales = (pluginKey: string, locales: Resource) => {
  pluginLocaleRegistry.set(pluginKey, locales);
};

export const clearPluginLocales = () => {
  pluginLocaleRegistry.clear();
};

export const registeredPluginLocales = (): Resource[] => [
  ...pluginLocaleRegistry.values(),
];

/** Plugin packs first, host last so plugins cannot overwrite host strings. */
export const mergeHostAndPluginLocales = (
  host: Resource,
  pluginLocales: readonly Resource[],
): Resource =>
  pluginLocales.length === 0
    ? host
    : (deepmerge(...pluginLocales, host) as Resource);
