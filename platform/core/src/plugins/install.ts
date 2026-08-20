import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { defaultConfig } from '../config';
import { logger } from '../log';
import { allpeepDb } from '../db';
import { configs } from '../db/pg/schema/documents';
import { nowIso } from '../db/pg/mappers';
import { eq } from 'drizzle-orm';
import { setPluginEnabledOverride } from './state';

const log = logger('core:plugins:install');

const INSTALLED_PLUGINS_KEY = 'openpeeps-installed-plugins';

type InstalledPluginsBody = Record<
  string,
  { source: string; installedAt: string; installedBy?: string }
>;

type InstallSource =
  | { type: 'npm'; package: string; version?: string }
  | { type: 'git'; url: string; ref?: string };

const getInstalledPlugins = async (): Promise<InstalledPluginsBody> => {
  const { db } = await allpeepDb();
  const rows = await db
    .select()
    .from(configs)
    .where(eq(configs.key, INSTALLED_PLUGINS_KEY))
    .limit(1);
  return (rows[0]?.body as InstalledPluginsBody | undefined) ?? {};
};

const setInstalledPlugin = async (
  pluginKey: string,
  source: string,
  installedBy?: string,
): Promise<void> => {
  const installed = await getInstalledPlugins();
  const body: InstalledPluginsBody = {
    ...installed,
    [pluginKey]: { source, installedAt: nowIso(), installedBy },
  };
  const ts = nowIso();
  const { db } = await allpeepDb();
  await db
    .insert(configs)
    .values({ key: INSTALLED_PLUGINS_KEY, body, createdAt: ts, updatedAt: ts })
    .onConflictDoUpdate({
      target: configs.key,
      set: { body, updatedAt: ts },
    });
};

const removeInstalledPlugin = async (pluginKey: string): Promise<void> => {
  const installed = await getInstalledPlugins();
  const { [pluginKey]: _removed, ...rest } = installed;
  const ts = nowIso();
  const { db } = await allpeepDb();
  await db
    .insert(configs)
    .values({
      key: INSTALLED_PLUGINS_KEY,
      body: rest,
      createdAt: ts,
      updatedAt: ts,
    })
    .onConflictDoUpdate({
      target: configs.key,
      set: { body: rest, updatedAt: ts },
    });
};

const runCommand = (
  command: string,
  args: string[],
  cwd: string,
): Promise<{ exitCode: number; stdout: string; stderr: string }> =>
  new Promise((resolve) => {
    const child = spawn(command, args, { cwd, shell: true });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on('close', (exitCode) => {
      resolve({ exitCode: exitCode ?? 1, stdout, stderr });
    });
    child.on('error', (err) => {
      resolve({ exitCode: 1, stdout, stderr: String(err) });
    });
  });

const getPluginDir = async () => {
  const { plugins } = await defaultConfig;
  return plugins.path;
};

const sourceLabel = (source: InstallSource): string =>
  source.type === 'npm'
    ? `npm:${source.package}${source.version ? `@${source.version}` : ''}`
    : `git:${source.url}${source.ref ? `#${source.ref}` : ''}`;

export const installPlugin = async (
  source: InstallSource,
  installedBy?: string,
): Promise<{
  success: boolean;
  pluginKey?: string;
  error?: string;
}> => {
  const pluginsDir = await getPluginDir();
  const label = sourceLabel(source);

  let tempDir: string;
  try {
    tempDir = await fs.mkdtemp(path.join(pluginsDir, '.install-'));
  } catch (e) {
    log.error(e, `Failed to create temp dir in ${pluginsDir}`);
    return { success: false, error: `Cannot write to plugins directory: ${e}` };
  }

  try {
    let installDir: string;

    if (source.type === 'npm') {
      const pkg = source.version
        ? `${source.package}@${source.version}`
        : source.package;

      log.info(`Installing npm package ${pkg} to temp dir ${tempDir}`);
      const init = await runCommand('npm', ['init', '-y'], tempDir);
      if (init.exitCode !== 0) {
        return { success: false, error: `npm init failed: ${init.stderr}` };
      }
      const install = await runCommand('npm', ['install', pkg], tempDir);
      if (install.exitCode !== 0) {
        return {
          success: false,
          error: `npm install failed: ${install.stderr}`,
        };
      }

      installDir = path.join(tempDir, 'node_modules', source.package);
    } else {
      log.info(`Cloning git repo ${source.url} to temp dir ${tempDir}`);
      const cloneArgs = ['clone', '--depth', '1'];
      if (source.ref) {
        cloneArgs.push('--branch', source.ref);
      }
      cloneArgs.push(source.url, path.join(tempDir, 'repo'));
      const clone = await runCommand('git', cloneArgs, tempDir);
      if (clone.exitCode !== 0) {
        return { success: false, error: `git clone failed: ${clone.stderr}` };
      }
      installDir = path.join(tempDir, 'repo');
    }

    // Read package.json to determine namespace/name
    const pkgJsonRaw = await fs.readFile(
      path.join(installDir, 'package.json'),
      'utf-8',
    );
    const pkgJson = JSON.parse(pkgJsonRaw);

    const namespace =
      pkgJson.openpeeps?.namespace ??
      pkgJson.name?.split('/')[0]?.replace(/^@/, '') ??
      'custom';
    const name =
      pkgJson.openpeeps?.name ??
      pkgJson.name?.split('/')[1] ??
      pkgJson.name?.replace(/^@[^/]+\//, '') ??
      'plugin';

    const pluginKey = `${namespace}/${name}`;
    const destDir = path.join(pluginsDir, namespace, name);

    // Check if already exists in the plugins dir (built-in)
    const existingEntries = await fs
      .readdir(pluginsDir)
      .catch((): string[] => []);
    const nsEntries = existingEntries.includes(namespace)
      ? await fs
          .readdir(path.join(pluginsDir, namespace))
          .catch((): string[] => [])
      : [];
    if (nsEntries.includes(name)) {
      // Check if this is a built-in plugin (not in installed list)
      const installed = await getInstalledPlugins();
      if (!installed[pluginKey]) {
        return {
          success: false,
          error: `Plugin "${pluginKey}" is a built-in plugin and cannot be overwritten.`,
        };
      }
    }

    // Build the plugin if it has a build script
    if (pkgJson.scripts?.build) {
      log.info(`Building plugin ${pluginKey}...`);
      const buildDeps = await runCommand('npm', ['install'], installDir);
      if (buildDeps.exitCode !== 0) {
        return {
          success: false,
          error: `Dependency install failed: ${buildDeps.stderr}`,
        };
      }
      const build = await runCommand('npm', ['run', 'build'], installDir);
      if (build.exitCode !== 0) {
        return {
          success: false,
          error: `Build failed: ${build.stderr}`,
        };
      }
    }

    // Move to final location
    await fs.mkdir(path.join(pluginsDir, namespace), { recursive: true });
    await fs.rm(destDir, { recursive: true, force: true });
    await fs.cp(installDir, destDir, { recursive: true });
    await fs.rm(tempDir, { recursive: true, force: true });

    await setInstalledPlugin(pluginKey, label, installedBy);
    // Installed plugins never auto-enable — an admin must explicitly
    // activate them via the enable toggle (Phase B) after reviewing them.
    await setPluginEnabledOverride(pluginKey, false);
    log.info(
      `Plugin ${pluginKey} installed successfully from ${label}${
        installedBy ? ` by ${installedBy}` : ''
      }. Disabled by default — activate it explicitly to load it.`,
    );

    return { success: true, pluginKey };
  } catch (e) {
    // Cleanup on any error
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    const message = e instanceof Error ? e.message : String(e);
    log.error(e, `Failed to install plugin from ${label}.`);
    return { success: false, error: message };
  }
};

export const uninstallPlugin = async (
  pluginKey: string,
  uninstalledBy?: string,
): Promise<{ success: boolean; error?: string }> => {
  const installed = await getInstalledPlugins();
  if (!installed[pluginKey]) {
    return {
      success: false,
      error: `Plugin "${pluginKey}" was not installed via the admin UI.`,
    };
  }

  const pluginsDir = await getPluginDir();
  const pluginDir = path.join(pluginsDir, pluginKey);

  try {
    await fs.rm(pluginDir, { recursive: true, force: true });
    await removeInstalledPlugin(pluginKey);
    log.info(
      `Plugin ${pluginKey} uninstalled${
        uninstalledBy ? ` by ${uninstalledBy}` : ''
      }.`,
    );
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    log.error(e, `Failed to uninstall plugin ${pluginKey}.`);
    return { success: false, error: message };
  }
};

export const getInstalledPluginKeys = async (): Promise<string[]> => {
  const installed = await getInstalledPlugins();
  return Object.keys(installed);
};
