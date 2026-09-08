import { EventEmitter } from 'node:events';
import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  ChildProcessWithoutNullStreams,
  SpawnOptions,
} from 'node:child_process';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

interface SpawnCall {
  command: string;
  args: readonly string[];
  options: SpawnOptions;
}

const testState = vi.hoisted(() => ({
  pluginsDir: `/tmp/openpeeps-plugin-install-${process.pid}`,
  spawnCalls: [] as SpawnCall[],
  persistedValues: [] as unknown[],
  logs: [] as unknown[],
  npmConfig: '',
  npmConfigMode: 0,
  askpass: '',
  askpassMode: 0,
  sshKey: '',
  sshKeyMode: 0,
  pluginBuild: false,
  buildSawNpmConfig: false,
  peerDependencies: undefined as Record<string, string> | undefined,
  failure: undefined as
    | {
        command: string;
        args?: string[];
        stdout?: string;
        stderr: string;
      }
    | undefined,
}));

vi.mock('node:child_process', () => ({
  spawn: vi.fn(
    (command: string, args: readonly string[], options: SpawnOptions) => {
      testState.spawnCalls.push({ command, args, options });
      const child = new EventEmitter() as EventEmitter & {
        stdout: EventEmitter;
        stderr: EventEmitter;
      };
      child.stdout = new EventEmitter();
      child.stderr = new EventEmitter();

      setImmediate(() => {
        void (async () => {
          const environment = options.env ?? {};
          if (environment.NPM_CONFIG_USERCONFIG) {
            const configPath = String(environment.NPM_CONFIG_USERCONFIG);
            testState.npmConfig = await fs.readFile(configPath, 'utf8');
            testState.npmConfigMode = (await fs.stat(configPath)).mode & 0o777;
          }
          if (environment.GIT_ASKPASS) {
            const askpassPath = String(environment.GIT_ASKPASS);
            testState.askpass = await fs.readFile(askpassPath, 'utf8');
            testState.askpassMode = (await fs.stat(askpassPath)).mode & 0o777;
          }
          if (environment.GIT_SSH_COMMAND) {
            const keyPath = path.join(String(options.cwd), 'git-deploy-key');
            testState.sshKey = await fs.readFile(keyPath, 'utf8');
            testState.sshKeyMode = (await fs.stat(keyPath)).mode & 0o777;
          }
          if (command === 'npm' && args[0] === 'run' && args[1] === 'build') {
            testState.buildSawNpmConfig = await fs
              .access(path.join(String(options.cwd), '..', '..', '.npmrc'))
              .then(() => true)
              .catch(() => false);
          }

          if (
            testState.failure?.command === command &&
            (!testState.failure.args ||
              testState.failure.args.every((arg, index) => args[index] === arg))
          ) {
            if (testState.failure.stdout) {
              child.stdout.emit('data', Buffer.from(testState.failure.stdout));
            }
            child.stderr.emit('data', Buffer.from(testState.failure.stderr));
            child.emit('close', 1);
            return;
          }

          if (command === 'git') {
            const destination = args.at(-1);
            if (destination) {
              await writePlugin(destination);
            }
          }
          if (command === 'npm' && args[0] === 'install' && args.length === 3) {
            await writePlugin(
              path.join(String(options.cwd), 'node_modules', String(args[2])),
            );
          }
          child.emit('close', 0);
        })();
      });

      return child as unknown as ChildProcessWithoutNullStreams;
    },
  ),
}));

vi.mock('../config', () => ({
  defaultConfig: Promise.resolve({
    plugins: { path: testState.pluginsDir },
  }),
}));

vi.mock('../db', () => ({
  allpeepDb: vi.fn(async () => ({
    db: {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [],
          }),
        }),
      }),
      insert: () => ({
        values: (value: unknown) => {
          testState.persistedValues.push(value);
          return {
            onConflictDoUpdate: async () => undefined,
          };
        },
      }),
    },
  })),
}));

vi.mock('./state', () => ({
  setPluginEnabledOverride: vi.fn(async () => undefined),
}));

vi.mock('../log', () => ({
  logger: () => ({
    info: (...args: unknown[]) => testState.logs.push(args),
    error: (...args: unknown[]) => testState.logs.push(args),
  }),
}));

const writePlugin = async (directory: string) => {
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(
    path.join(directory, 'package.json'),
    JSON.stringify({
      name: '@acme/private-plugin',
      scripts: testState.pluginBuild ? { build: 'build' } : undefined,
      peerDependencies: testState.peerDependencies,
    }),
  );
};

const { installPlugin } = await import('./install');

beforeEach(async () => {
  await fs.rm(testState.pluginsDir, { recursive: true, force: true });
  await fs.mkdir(testState.pluginsDir, { recursive: true });
  testState.spawnCalls.length = 0;
  testState.persistedValues.length = 0;
  testState.logs.length = 0;
  testState.npmConfig = '';
  testState.npmConfigMode = 0;
  testState.askpass = '';
  testState.askpassMode = 0;
  testState.sshKey = '';
  testState.sshKeyMode = 0;
  testState.pluginBuild = false;
  testState.buildSawNpmConfig = false;
  testState.peerDependencies = undefined;
  testState.failure = undefined;
});

afterAll(async () => {
  await fs.rm(testState.pluginsDir, { recursive: true, force: true });
});

describe('installPlugin credentials', () => {
  it('passes npm tokens through a temporary config without shell execution', async () => {
    const token = 'npm-secret-token';
    testState.pluginBuild = true;
    const result = await installPlugin({
      type: 'npm',
      package: 'private-plugin;echo unsafe',
      auth: {
        token,
        registry: 'https://npm.example.com/packages',
      },
    });

    expect(result).toEqual({
      success: true,
      pluginKey: 'acme/private-plugin',
    });
    const installCall = testState.spawnCalls.find(
      ({ command, args }) => command === 'npm' && args[0] === 'install',
    );
    expect(installCall?.args).toEqual([
      'install',
      '--omit=peer',
      'private-plugin;echo unsafe',
    ]);
    expect(installCall?.options.shell).toBe(false);
    expect(testState.npmConfig).toContain(
      '//npm.example.com/packages/:_authToken=npm-secret-token',
    );
    expect(testState.npmConfigMode).toBe(0o600);
    const buildCall = testState.spawnCalls.find(
      ({ command, args }) =>
        command === 'npm' && args[0] === 'run' && args[1] === 'build',
    );
    expect(buildCall?.options.env).not.toHaveProperty('NPM_CONFIG_USERCONFIG');
    expect(testState.buildSawNpmConfig).toBe(false);
    expect(
      testState.spawnCalls
        .filter(
          ({ command, args }) => command === 'npm' && args[0] === 'install',
        )
        .every(({ args }) => args.includes('--omit=peer')),
    ).toBe(true);
    expect(
      JSON.stringify([testState.persistedValues, testState.logs]),
    ).not.toContain(token);
  });

  it('uses askpass for HTTPS git tokens without putting them in arguments', async () => {
    const token = 'git-secret-token';
    const result = await installPlugin({
      type: 'git',
      url: 'https://git.example.com/acme/private-plugin.git',
      auth: {
        type: 'token',
        username: 'git-user',
        token,
      },
    });

    expect(result.success).toBe(true);
    const cloneCall = testState.spawnCalls.find(
      ({ command }) => command === 'git',
    );
    expect(cloneCall?.args.join(' ')).not.toContain(token);
    expect(cloneCall?.options.env).toMatchObject({
      GIT_ASKPASS_REQUIRE: 'force',
      GIT_TERMINAL_PROMPT: '0',
      OPENPEEPS_GIT_TOKEN: token,
      OPENPEEPS_GIT_USERNAME: 'git-user',
    });
    expect(testState.askpass).not.toContain(token);
    expect(testState.askpassMode).toBe(0o700);
    expect(
      JSON.stringify([testState.persistedValues, testState.logs]),
    ).not.toContain(token);
  });

  it('uses a temporary SSH deploy key with trust on first use', async () => {
    const privateKey =
      '-----BEGIN PRIVATE KEY-----\nkey\n-----END PRIVATE KEY-----';
    const result = await installPlugin({
      type: 'git',
      url: 'ssh://git@git.example.com/acme/private-plugin.git',
      auth: { type: 'ssh', privateKey },
    });

    expect(result.success).toBe(true);
    const cloneCall = testState.spawnCalls.find(
      ({ command }) => command === 'git',
    );
    expect(cloneCall?.args).toContain(
      'ssh://git@git.example.com/acme/private-plugin.git',
    );
    expect(cloneCall?.options.env?.GIT_SSH_COMMAND).toContain(
      'StrictHostKeyChecking=accept-new',
    );
    expect(testState.sshKey.trim()).toBe(privateKey);
    expect(testState.sshKeyMode).toBe(0o600);
    expect(
      JSON.stringify([testState.persistedValues, testState.logs]),
    ).not.toContain(privateKey);
  });

  it('redacts command errors and removes temporary credentials', async () => {
    const token = 'failed-secret-token';
    testState.failure = {
      command: 'git',
      stderr: `authentication failed for ${token}`,
    };

    const result = await installPlugin({
      type: 'git',
      url: 'https://git.example.com/acme/private-plugin.git',
      auth: {
        type: 'token',
        username: 'git-user',
        token,
      },
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('[REDACTED]');
    expect(result.error).not.toContain(token);
    expect(await fs.readdir(testState.pluginsDir)).toEqual([]);
  });

  it('returns and logs build stdout when tsc writes errors there', async () => {
    testState.pluginBuild = true;
    testState.failure = {
      command: 'npm',
      args: ['run', 'build'],
      stdout: "error TS2307: Cannot find module '@openpeepshq/core'",
      stderr: '$ tsc',
    };

    const result = await installPlugin({
      type: 'git',
      url: 'https://git.example.com/acme/private-plugin.git',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('$ tsc');
    expect(result.error).toContain("Cannot find module '@openpeepshq/core'");
    expect(JSON.stringify(testState.logs)).toContain(
      'Plugin acme/private-plugin build failed.',
    );
  });

  it('links declared peer dependencies to the host packages before build', async () => {
    testState.pluginBuild = true;
    testState.peerDependencies = { '@openpeepshq/common': '^0.1.45' };

    const result = await installPlugin({
      type: 'git',
      url: 'https://git.example.com/acme/private-plugin.git',
    });

    expect(result).toEqual({
      success: true,
      pluginKey: 'acme/private-plugin',
    });
    const linked = path.join(
      testState.pluginsDir,
      'acme',
      'private-plugin',
      'node_modules',
      '@openpeepshq',
      'common',
    );
    expect((await fs.lstat(linked)).isSymbolicLink()).toBe(true);
  });
});
