import { PackageJson } from 'type-fest';
import fs from 'node:fs';
import path from 'node:path';
import { logger } from '../log';

const log = logger('core:plugins');

const isPluginEnabled = (info: PackageJson) =>
  (info as PackageJson & { openpeeps?: { enabled?: boolean } }).openpeeps
    ?.enabled !== false;

export const sortByDependencies = (pluginInfos: [string, PackageJson][]) => {
  const pluginKeys = pluginInfos.map(([key]) => key);
  const packageNameToKey = new Map<string, string>(
    pluginInfos
      .filter(([, info]) => typeof info.name === 'string')
      .map(([key, info]) => [info.name as string, key]),
  );

  const resolvePluginDependencyKey = (
    dependencyKey: string,
  ): string | undefined => {
    if (pluginKeys.includes(dependencyKey)) {
      return dependencyKey;
    }
    return packageNameToKey.get(dependencyKey);
  };

  let addedPluginInfos: [string, PackageJson][] = [];
  let pluginInfosToAdd = pluginInfos;

  do {
    const addedPluginKeys = addedPluginInfos.map(([key]) => key);
    if (pluginInfosToAdd.length === 0) {
      break;
    }

    const addablePluginInfos = pluginInfosToAdd.filter(([, info]) =>
      Object.keys(info.dependencies || {}).every((dependencyKey) => {
        const pluginDependencyKey = resolvePluginDependencyKey(dependencyKey);
        return (
          pluginDependencyKey === undefined ||
          addedPluginKeys.includes(pluginDependencyKey)
        );
      }),
    );

    if (addablePluginInfos.length === 0) {
      log.error(
        `Dependency cycle or unresolved dependency detected. The following plugins could not be loaded: ${pluginInfosToAdd
          .map(([key]) => key)
          .join(', ')}`,
      );
      break;
    }

    addedPluginInfos = addedPluginInfos.concat(addablePluginInfos);
    pluginInfosToAdd = pluginInfos.filter(
      ([key]) => !addedPluginInfos.map(([key]) => key).includes(key),
    );
  } while (pluginInfosToAdd.length > 0);

  return addedPluginInfos;
};

const enumeratePluginsForNamespace = (
  pluginsPath: string,
  namespace: string,
): [string, PackageJson][] => {
  return fs
    .readdirSync(path.join(pluginsPath, namespace))
    .filter((pluginName) =>
      fs.lstatSync(path.join(pluginsPath, namespace, pluginName)).isDirectory(),
    )
    .map((name) => {
      const key = path.join(namespace, name);
      const info = JSON.parse(
        fs.readFileSync(
          path.join(path.join(pluginsPath, key), 'package.json'),
          'utf-8',
        ),
      ) as PackageJson;
      return [key, info] as [string, PackageJson];
    })
    .filter(([key, info]) => {
      if (isPluginEnabled(info)) {
        return true;
      }
      log.info(`Skipping disabled plugin ${key}.`);
      return false;
    });
};

export const enumeratePluginInfos = async (pluginsPath: string) => {
  if (fs.existsSync(pluginsPath)) {
    const namespaces = fs
      .readdirSync(pluginsPath)
      .filter((namespace) =>
        fs.lstatSync(path.join(pluginsPath, namespace)).isDirectory(),
      );

    return namespaces
      .map((namespace) => enumeratePluginsForNamespace(pluginsPath, namespace))
      .flat();
  } else {
    return [];
  }
};
