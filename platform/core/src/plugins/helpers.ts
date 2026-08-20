import { PackageJson } from 'type-fest';
import fs from 'node:fs';
import path from 'node:path';
import { logger } from '../log';

const log = logger('core:plugins');

export const isPluginEnabled = (info: PackageJson) =>
  (info as PackageJson & { openpeeps?: { enabled?: boolean } }).openpeeps
    ?.enabled !== false;

type PluginInfo = [string, PackageJson, string];

export const sortByDependencies = (pluginInfos: PluginInfo[]) => {
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

  let addedPluginInfos: PluginInfo[] = [];
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
): PluginInfo[] => {
  return fs
    .readdirSync(path.join(pluginsPath, namespace))
    .filter((pluginName) =>
      fs.lstatSync(path.join(pluginsPath, namespace, pluginName)).isDirectory(),
    )
    .map((name) => {
      const key = path.join(namespace, name);
      const pluginPath = path.join(pluginsPath, key);
      const info = JSON.parse(
        fs.readFileSync(path.join(pluginPath, 'package.json'), 'utf-8'),
      ) as PackageJson;
      return [key, info, pluginPath] as PluginInfo;
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

// Plugins outside `plugins/<namespace>/<name>/` (e.g. `examples/*`) are not
// scanned automatically. They only load when explicitly referenced from the
// root `package.json`'s `openpeeps.plugins` array (paths relative to the repo
// root), keeping example/demo plugins opt-in.
export const enumerateReferencedPluginInfos = (
  rootPackageJsonPath: string,
): PluginInfo[] => {
  if (!fs.existsSync(rootPackageJsonPath)) {
    return [];
  }

  const rootPackageJson = JSON.parse(
    fs.readFileSync(rootPackageJsonPath, 'utf-8'),
  ) as PackageJson & { openpeeps?: { plugins?: string[] } };
  const repoRoot = path.dirname(rootPackageJsonPath);

  return (rootPackageJson.openpeeps?.plugins ?? []).map((relativePath) => {
    const pluginPath = path.join(repoRoot, relativePath);
    const key = path.join('examples', path.basename(pluginPath));
    const info = JSON.parse(
      fs.readFileSync(path.join(pluginPath, 'package.json'), 'utf-8'),
    ) as PackageJson;
    return [key, info, pluginPath] as PluginInfo;
  });
};
