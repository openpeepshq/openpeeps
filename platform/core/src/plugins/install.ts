import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { PluginInstallSource } from '@openpeepshq/common/types';
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
  const rest = Object.fromEntries(
    Object.entries(installed).filter(([key]) => key !== pluginKey),
  );
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
  environment: NodeJS.ProcessEnv = {},
): Promise<{ exitCode: number; stdout: string; stderr: string }> =>
  new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      env: {
        HOME: process.env.HOME,
        LANG: process.env.LANG,
        LC_ALL: process.env.LC_ALL,
        NODE_EXTRA_CA_CERTS: process.env.NODE_EXTRA_CA_CERTS,
        PATH: process.env.PATH,
        SSL_CERT_DIR: process.env.SSL_CERT_DIR,
        SSL_CERT_FILE: process.env.SSL_CERT_FILE,
        TMPDIR: process.env.TMPDIR,
        ...environment,
      },
      shell: false,
    });
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

const redactUrl = (url: string): string => {
  const parsed = new URL(url);
  if (parsed.protocol !== 'ssh:') {
    parsed.username = '';
  }
  parsed.password = '';
  return parsed.toString();
};

const sourceLabel = (source: PluginInstallSource): string =>
  source.type === 'npm'
    ? `npm:${source.package}${source.version ? `@${source.version}` : ''}`
    : `git:${redactUrl(source.url)}${source.ref ? `#${source.ref}` : ''}`;

const sourceSecrets = (source: PluginInstallSource): string[] => {
  if (source.type === 'npm') {
    return source.auth ? [source.auth.token] : [];
  }
  if (!source.auth) {
    return [];
  }
  if (source.auth.type === 'token') {
    return [source.auth.token];
  }
  return [source.auth.privateKey];
};

const redactSecrets = (value: string, secrets: string[]): string =>
  secrets.reduce(
    (redacted, secret) => redacted.split(secret).join('[REDACTED]'),
    value,
  );

const commandFailure = (
  operation: string,
  result: { stderr: string },
  secrets: string[],
): string =>
  `${operation} failed: ${redactSecrets(result.stderr, secrets)}`.trim();

const writeNpmConfig = async (
  tempDir: string,
  auth: Extract<PluginInstallSource, { type: 'npm' }>['auth'],
): Promise<NodeJS.ProcessEnv> => {
  if (!auth) {
    return {};
  }
  const registry = new URL(auth.registry ?? 'https://registry.npmjs.org/');
  const registryUrl = registry.toString().replace(/\/?$/, '/');
  const authPath = registry.pathname.replace(/\/?$/, '/');
  const configPath = path.join(tempDir, '.npmrc');
  await fs.writeFile(
    configPath,
    [
      `registry=${registryUrl}`,
      `//${registry.host}${authPath}:_authToken=${auth.token}`,
      'always-auth=true',
      '',
    ].join('\n'),
    { mode: 0o600 },
  );
  return { NPM_CONFIG_USERCONFIG: configPath };
};

const removeNpmConfig = (tempDir: string): Promise<void> =>
  fs.rm(path.join(tempDir, '.npmrc'), { force: true });

const writeGitAuth = async (
  tempDir: string,
  auth: Extract<PluginInstallSource, { type: 'git' }>['auth'],
): Promise<NodeJS.ProcessEnv> => {
  if (!auth) {
    return { GIT_TERMINAL_PROMPT: '0' };
  }
  if (auth.type === 'token') {
    const askpassPath = path.join(tempDir, 'git-askpass');
    await fs.writeFile(
      askpassPath,
      [
        '#!/bin/sh',
        'case "$1" in',
        '  *Username*) printf "%s\\n" "$OPENPEEPS_GIT_USERNAME" ;;',
        '  *) printf "%s\\n" "$OPENPEEPS_GIT_TOKEN" ;;',
        'esac',
        '',
      ].join('\n'),
      { mode: 0o700 },
    );
    return {
      GIT_ASKPASS: askpassPath,
      GIT_ASKPASS_REQUIRE: 'force',
      GIT_TERMINAL_PROMPT: '0',
      OPENPEEPS_GIT_TOKEN: auth.token,
      OPENPEEPS_GIT_USERNAME: auth.username,
    };
  }

  const keyPath = path.join(tempDir, 'git-deploy-key');
  const knownHostsPath = path.join(tempDir, 'known_hosts');
  await fs.writeFile(keyPath, `${auth.privateKey.trim()}\n`, { mode: 0o600 });
  await fs.writeFile(knownHostsPath, '', { mode: 0o600 });
  return {
    GIT_SSH_COMMAND: [
      'ssh',
      '-F /dev/null',
      `-i "${keyPath}"`,
      '-o BatchMode=yes',
      '-o IdentitiesOnly=yes',
      '-o StrictHostKeyChecking=accept-new',
      `-o UserKnownHostsFile="${knownHostsPath}"`,
    ].join(' '),
    GIT_SSH_VARIANT: 'ssh',
    GIT_TERMINAL_PROMPT: '0',
  };
};

export const installPlugin = async (
  source: PluginInstallSource,
  installedBy?: string,
): Promise<{
  success: boolean;
  pluginKey?: string;
  error?: string;
}> => {
  const pluginsDir = await getPluginDir();
  const label = sourceLabel(source);
  const secrets = sourceSecrets(source);

  let tempDir: string;
  try {
    tempDir = await fs.mkdtemp(path.join(pluginsDir, '.install-'));
  } catch (e) {
    log.error(e, `Failed to create temp dir in ${pluginsDir}`);
    return { success: false, error: `Cannot write to plugins directory: ${e}` };
  }

  try {
    let installDir: string;
    let npmEnvironment: NodeJS.ProcessEnv | undefined;

    if (source.type === 'npm') {
      const pkg = source.version
        ? `${source.package}@${source.version}`
        : source.package;

      log.info(`Installing npm package ${pkg} to temp dir ${tempDir}`);
      const init = await runCommand('npm', ['init', '-y'], tempDir);
      if (init.exitCode !== 0) {
        return {
          success: false,
          error: commandFailure('npm init', init, secrets),
        };
      }
      npmEnvironment = await writeNpmConfig(tempDir, source.auth);
      const install = await runCommand(
        'npm',
        ['install', pkg],
        tempDir,
        npmEnvironment,
      );
      if (install.exitCode !== 0) {
        return {
          success: false,
          error: commandFailure('npm install', install, secrets),
        };
      }

      installDir = path.join(tempDir, 'node_modules', source.package);
    } else {
      const repositoryUrl = redactUrl(source.url);
      log.info(`Cloning git repo ${repositoryUrl} to temp dir ${tempDir}`);
      const cloneArgs = ['clone', '--depth', '1'];
      if (source.ref) {
        cloneArgs.push('--branch', source.ref);
      }
      cloneArgs.push(repositoryUrl, path.join(tempDir, 'repo'));
      const gitEnvironment = await writeGitAuth(tempDir, source.auth);
      const clone = await runCommand('git', cloneArgs, tempDir, gitEnvironment);
      if (clone.exitCode !== 0) {
        return {
          success: false,
          error: commandFailure('git clone', clone, secrets),
        };
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
      const buildDeps = await runCommand(
        'npm',
        ['install'],
        installDir,
        npmEnvironment,
      );
      if (buildDeps.exitCode !== 0) {
        return {
          success: false,
          error: commandFailure('Dependency install', buildDeps, secrets),
        };
      }
      await removeNpmConfig(tempDir);
      const build = await runCommand('npm', ['run', 'build'], installDir);
      if (build.exitCode !== 0) {
        return {
          success: false,
          error: commandFailure('Build', build, secrets),
        };
      }
    }

    // Move to final location
    await removeNpmConfig(tempDir);
    await fs.mkdir(path.join(pluginsDir, namespace), { recursive: true });
    await fs.rm(destDir, { recursive: true, force: true });
    await fs.cp(installDir, destDir, { recursive: true });
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
    const rawMessage = e instanceof Error ? e.message : String(e);
    const message = redactSecrets(rawMessage, secrets);
    log.error(new Error(message), `Failed to install plugin from ${label}.`);
    return { success: false, error: message };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
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
