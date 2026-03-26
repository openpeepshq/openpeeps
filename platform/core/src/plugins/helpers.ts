import { PackageJson } from 'type-fest';
import fs from 'node:fs';
import path from 'node:path';

export const sortByDependencies = (pluginInfos: [string, PackageJson][]) => {
  const pluginKeys = pluginInfos.map(([key]) => key);

  let addedPluginInfos: [string, PackageJson][] = [];
  let pluginInfosToAdd = pluginInfos;

  do {
    const addedPluginKeys = addedPluginInfos.map(([key]) => key);
    if (pluginInfosToAdd.length === 0) {
      break;
    }

    const addablePluginInfos = pluginInfosToAdd.filter(([, info]) =>
      Object.keys(info.dependencies || {}).every(
        (dependencyKey) =>
          addedPluginKeys.includes(dependencyKey) ||
          !pluginKeys.includes(dependencyKey),
      ),
    );

    if (addablePluginInfos.length === 0) {
      console.error(
        `The following plugins could not be added: ${pluginInfosToAdd
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
      return [key, info];
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
