import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { EventEmitter } from 'node:events';
import fs from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import type {
  ChildProcessWithoutNullStreams,
  SpawnOptions,
} from 'node:child_process';
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

interface SpawnCall {
  command: string;
  args: readonly string[];
  options: SpawnOptions;
}

const testState = vi.hoisted(() => ({
  pluginsDir: `/tmp/openpeeps-plugin-install-${process.pid}`,
  spawnCalls: [] as SpawnCall[],
  persistedValues: [] as unknown[],
  storedConfigRows: [] as Array<{ key: string; body: unknown }>,
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
  storePublicKey: undefined as string | undefined,
  pkgOverride: undefined as Record<string, unknown> | undefined,
  useRealTar: false,
  tarListing: undefined as { verbose: string; names: string } | undefined,
}));

const realCpHolder = vi.hoisted(() => ({
  cp: undefined as typeof import('node:child_process') | undefined,
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

      if (command === 'tar' && testState.useRealTar) {
        const real = realCpHolder.cp!.spawn(command, [...args], options);
        real.stdout?.on('data', (chunk: Buffer) =>
          child.stdout.emit('data', chunk),
        );
        real.stderr?.on('data', (chunk: Buffer) =>
          child.stderr.emit('data', chunk),
        );
        real.on('error', (error: Error) => {
          child.stderr.emit('data', Buffer.from(error.message, 'utf8'));
          child.emit('close', 1);
        });
        real.on('close', (code: number | null) =>
          child.emit('close', code ?? 1),
        );
        return child as unknown as ChildProcessWithoutNullStreams;
      }

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

          if (command === 'tar') {
            if (testState.tarListing) {
              const verbose = args.includes('-tzvf');
              child.stdout.emit(
                'data',
                Buffer.from(
                  verbose
                    ? testState.tarListing.verbose
                    : testState.tarListing.names,
                ),
              );
            } else {
              const cIndex = args.indexOf('-C');
              if (cIndex !== -1) {
                await writePlugin(
                  path.join(String(args[cIndex + 1]), 'plugin'),
                );
              }
            }
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
    plugins: {
      get path() {
        return testState.pluginsDir;
      },
      storeUrl: 'https://plugins.test',
      get storePublicKey() {
        return testState.storePublicKey;
      },
    },
    server: { host: 'localhost:5173' },
  }),
}));

vi.mock('../db', () => ({
  allpeepDb: vi.fn(async () => ({
    db: {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => testState.storedConfigRows,
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
      ...testState.pkgOverride,
    }),
  );
};

// Builds a minimal gzip-compressed tar archive byte-for-byte so fixtures
// do not depend on the system tar's handling of unusual member names:
// busybox tar (alpine CI) rewrites `../foo` sources to a normalized `foo`
// member at archive time, which would not carry the parent-directory path.
const buildTarGzip = (
  members: Array<{ name: string; content?: string; type?: 'file' | 'dir' }>,
) => {
  const blocks: Buffer[] = [];
  for (const member of members) {
    const content = Buffer.from(member.content ?? '');
    const isDir = member.type === 'dir';
    const header = Buffer.alloc(512);
    header.write(member.name, 0, 'utf8');
    header.write(isDir ? '0000755' : '0000644', 100, 'utf8');
    header.write('\0', 107, 'utf8');
    header.write('0000000', 108, 'utf8');
    header.write('\0', 115, 'utf8');
    header.write('0000000', 116, 'utf8');
    header.write('\0', 123, 'utf8');
    header.write(String(content.length).padStart(11, '0'), 124, 'utf8');
    header.write('\0', 135, 'utf8');
    header.write('00000000000', 136, 'utf8');
    header.write('\0', 147, 'utf8');
    for (let i = 148; i <= 155; i += 1) header[i] = 0x20;
    header.write(isDir ? '5' : '0', 156, 'utf8');
    header.write('ustar\0', 257, 'utf8');
    header.write('00', 263, 'utf8');
    const sum = header.reduce((total, byte) => total + byte, 0);
    header.write(sum.toString(8).padStart(6, '0'), 148, 'utf8');
    header[154] = 0;
    header[155] = 0x20;
    blocks.push(header, content);
    const padding = (512 - (content.length % 512)) % 512;
    if (padding > 0) blocks.push(Buffer.alloc(padding));
  }
  blocks.push(Buffer.alloc(1024));
  return gzipSync(Buffer.concat(blocks));
};

realCpHolder.cp = (await vi.importActual(
  'node:child_process',
)) as typeof import('node:child_process');

const { installPlugin, selfHealInstalledPlugins, verifyMarketplaceArtifact } =
  await import('./install');
const { setPluginEnabledOverride } = await import('./state');

beforeEach(async () => {
  await fs.rm(testState.pluginsDir, { recursive: true, force: true });
  await fs.mkdir(testState.pluginsDir, { recursive: true });
  testState.spawnCalls.length = 0;
  testState.persistedValues.length = 0;
  testState.storedConfigRows.length = 0;
  vi.mocked(setPluginEnabledOverride).mockClear();
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
  testState.storePublicKey = undefined;
  testState.pkgOverride = undefined;
  testState.useRealTar = false;
  testState.tarListing = undefined;
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
    const buildCall = testState.spawnCalls.find(
      ({ command, args }) =>
        command === 'npm' && args[0] === 'run' && args[1] === 'build',
    );
    expect(buildCall?.options.env).toMatchObject({ CI: 'true' });
    expect(
      await fs.readFile(
        path.join(
          testState.pluginsDir,
          'acme',
          'private-plugin',
          'pnpm-workspace.yaml',
        ),
        'utf8',
      ),
    ).toContain("packages:\n  - '.'");
  });
});

describe('installPlugin record persistence', () => {
  const storedInstallRecord = async () => {
    for (const value of testState.persistedValues) {
      const record = value as {
        key: string;
        body: Record<string, Record<string, unknown>>;
      };
      if (record.key === 'openpeeps-installed-plugins') {
        return record.body['acme/private-plugin'];
      }
    }
    return undefined;
  };

  it('marks a credential-backed install as requiring auth without storing the secret', async () => {
    const result = await installPlugin({
      type: 'npm',
      package: '@acme/private-plugin',
      auth: { token: 'persisted-secret-token' },
    });

    expect(result).toEqual({ success: true, pluginKey: 'acme/private-plugin' });
    const record = await storedInstallRecord();
    expect(record?.requiresAuth).toBe(true);
    expect(record?.source).toBe('npm:@acme/private-plugin');
    expect(JSON.stringify(testState.persistedValues)).not.toContain(
      'persisted-secret-token',
    );
  });

  it('marks an unauthenticated install as not requiring auth', async () => {
    await installPlugin({
      type: 'git',
      url: 'https://git.example.com/acme/private-plugin.git',
    });

    const record = await storedInstallRecord();
    expect(record?.requiresAuth).toBe(false);
    expect(record?.source).toBe(
      'git:https://git.example.com/acme/private-plugin.git',
    );
  });
});

describe('selfHealInstalledPlugins', () => {
  const seedInstalledRecord = (record: {
    source: string;
    requiresAuth: boolean;
    installedBy?: string;
  }) => {
    testState.storedConfigRows.push({
      key: 'openpeeps-installed-plugins',
      body: {
        'acme/private-plugin': {
          ...record,
          installedAt: '2026-01-01T00:00:00.000Z',
        },
      },
    });
  };

  it('re-downloads a missing public plugin without touching its enabled state', async () => {
    seedInstalledRecord({
      source: 'git:https://git.example.com/acme/private-plugin.git',
      requiresAuth: false,
      installedBy: 'admin@example.com',
    });

    const failures = await selfHealInstalledPlugins();

    expect(failures).toEqual({});
    await expect(
      fs.access(
        path.join(testState.pluginsDir, 'acme/private-plugin/package.json'),
      ),
    ).resolves.toBeUndefined();
    expect(setPluginEnabledOverride).not.toHaveBeenCalled();
    expect(testState.spawnCalls.some(({ command }) => command === 'npm')).toBe(
      false,
    );
  });

  it('does not re-download private plugins and reports them for re-install', async () => {
    seedInstalledRecord({
      source: 'git:https://git.example.com/acme/private-plugin.git#main',
      requiresAuth: true,
    });

    const failures = await selfHealInstalledPlugins();

    expect(Object.keys(failures)).toEqual(['acme/private-plugin']);
    expect(failures['acme/private-plugin']).toContain('private source');
    expect(testState.spawnCalls).toEqual([]);
    expect(await fs.readdir(testState.pluginsDir)).toEqual([]);
  });

  it('leaves healthy plugins alone', async () => {
    await fs.mkdir(path.join(testState.pluginsDir, 'acme/private-plugin'), {
      recursive: true,
    });
    await fs.writeFile(
      path.join(testState.pluginsDir, 'acme/private-plugin/package.json'),
      '{}',
    );
    seedInstalledRecord({
      source: 'npm:@acme/private-plugin',
      requiresAuth: true,
    });

    const failures = await selfHealInstalledPlugins();

    expect(failures).toEqual({});
    expect(testState.spawnCalls).toEqual([]);
  });

  it('records the error when a public re-download fails', async () => {
    testState.failure = {
      command: 'npm',
      args: ['install', '--omit=peer', '@acme/private-plugin'],
      stderr: 'npm ERR! 404 Not Found',
    };
    seedInstalledRecord({
      source: 'npm:@acme/private-plugin',
      requiresAuth: false,
    });

    const failures = await selfHealInstalledPlugins();

    expect(failures['acme/private-plugin']).toContain('404 Not Found');
    expect(await fs.readdir(testState.pluginsDir)).toEqual([]);
  });
});

const signBuffer = (buffer: Buffer, listing: string, version: string) => {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const sha256 = createHash('sha256').update(buffer).digest('hex');
  // The store signs listing, version and digest together so a signature
  // cannot be replayed across listings or versions.
  const signature = sign(
    null,
    Buffer.from(`${listing}\n${version}\n${sha256}`, 'utf8'),
    privateKey,
  ).toString('base64');
  return {
    buffer,
    sha256,
    signature,
    publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
  };
};

const signedArtifact = (listing = 'acme/private-plugin', version = '1.0.0') =>
  signBuffer(Buffer.from('plugin-tarball'), listing, version);

const storeArtifactHeaders = (artifact: {
  sha256: string;
  signature: string;
}) => ({
  'x-openpeeps-sha256': artifact.sha256,
  'x-openpeeps-signature': artifact.signature,
});

const entitlementBody = (
  artifact: { sha256: string; signature: string },
  version = '1.0.0',
) => ({
  token: 'download-token',
  version,
  sha256: artifact.sha256,
  signature: artifact.signature,
});

const stubStore = (
  entitlement: { ok: boolean; body?: unknown },
  artifact: { buffer: Buffer; headers: Record<string, string> },
) => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.endsWith('/v1/entitlements')) {
        return {
          ok: entitlement.ok,
          json: async () => entitlement.body,
        };
      }
      if (url.includes('/v1/artifacts/')) {
        return {
          ok: true,
          arrayBuffer: async () =>
            artifact.buffer.buffer.slice(
              artifact.buffer.byteOffset,
              artifact.buffer.byteOffset + artifact.buffer.byteLength,
            ),
          headers: {
            get: (name: string) =>
              Object.entries(artifact.headers).find(
                ([key]) => key.toLowerCase() === name.toLowerCase(),
              )?.[1] ?? null,
          },
        };
      }
      throw new Error(`unexpected fetch ${url}`);
    }),
  );
};

describe('marketplace install', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('verifies the signed digest bound to listing and version', () => {
    const artifact = signedArtifact();
    expect(
      verifyMarketplaceArtifact(
        artifact.buffer,
        artifact.sha256,
        'acme/private-plugin',
        '1.0.0',
        artifact.signature,
        artifact.publicKeyPem,
      ),
    ).toBe(true);
    expect(
      verifyMarketplaceArtifact(
        artifact.buffer,
        '0'.repeat(64),
        'acme/private-plugin',
        '1.0.0',
        artifact.signature,
        artifact.publicKeyPem,
      ),
    ).toBe(false);
    expect(
      verifyMarketplaceArtifact(
        artifact.buffer,
        artifact.sha256,
        'other/plugin',
        '1.0.0',
        artifact.signature,
        artifact.publicKeyPem,
      ),
    ).toBe(false);
  });

  it('downloads, verifies, and extracts a store tarball', async () => {
    const artifact = signedArtifact();
    testState.storePublicKey = artifact.publicKeyPem;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL) => {
        const url = String(input);
        if (url.endsWith('/v1/entitlements')) {
          return {
            ok: true,
            json: async () => ({
              token: 'download-token',
              version: '1.0.0',
              sha256: artifact.sha256,
              signature: artifact.signature,
            }),
          };
        }
        if (url.includes('/v1/artifacts/')) {
          return {
            ok: true,
            arrayBuffer: async () =>
              artifact.buffer.buffer.slice(
                artifact.buffer.byteOffset,
                artifact.buffer.byteOffset + artifact.buffer.byteLength,
              ),
            headers: {
              get: (name: string) =>
                name === 'x-openpeeps-sha256'
                  ? artifact.sha256
                  : name === 'x-openpeeps-signature'
                    ? artifact.signature
                    : null,
            },
          };
        }
        throw new Error(`unexpected fetch ${url}`);
      }),
    );

    const result = await installPlugin({
      type: 'marketplace',
      listing: 'acme/private-plugin',
    });

    expect(result).toEqual({
      success: true,
      pluginKey: 'acme/private-plugin',
    });
    expect(testState.spawnCalls.some(({ command }) => command === 'tar')).toBe(
      true,
    );
    const persisted = JSON.stringify(testState.persistedValues);
    expect(persisted).toContain('store:acme/private-plugin@1.0.0');
    expect(persisted).toContain(artifact.sha256);
  });

  it('rejects a tampered artifact', async () => {
    const artifact = signedArtifact();
    testState.storePublicKey = artifact.publicKeyPem;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL) => {
        const url = String(input);
        if (url.endsWith('/v1/entitlements')) {
          return {
            ok: true,
            json: async () => ({
              token: 'download-token',
              version: '1.0.0',
              sha256: artifact.sha256,
              signature: artifact.signature,
            }),
          };
        }
        return {
          ok: true,
          arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
          headers: {
            get: () => artifact.sha256,
          },
        };
      }),
    );

    const result = await installPlugin({
      type: 'marketplace',
      listing: 'acme/private-plugin',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('verification');
  });

  it('fails closed when the store signing key is not configured', async () => {
    const fetchCalls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL) => {
        fetchCalls.push(String(input));
        throw new Error(`unexpected fetch ${input}`);
      }),
    );

    const result = await installPlugin({
      type: 'marketplace',
      listing: 'acme/private-plugin',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('signing key');
    expect(fetchCalls).toEqual([]);
  });

  it('rejects a signature made for a different listing', async () => {
    const artifact = signedArtifact('other/plugin');
    testState.storePublicKey = artifact.publicKeyPem;
    stubStore(
      { ok: true, body: entitlementBody(artifact) },
      { buffer: artifact.buffer, headers: storeArtifactHeaders(artifact) },
    );

    const result = await installPlugin({
      type: 'marketplace',
      listing: 'acme/private-plugin',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('verification');
  });

  it('rejects an artifact for a different version than requested', async () => {
    const artifact = signedArtifact('acme/private-plugin', '2.0.0');
    testState.storePublicKey = artifact.publicKeyPem;
    stubStore(
      { ok: true, body: entitlementBody(artifact, '2.0.0') },
      { buffer: artifact.buffer, headers: storeArtifactHeaders(artifact) },
    );

    const result = await installPlugin({
      type: 'marketplace',
      listing: 'acme/private-plugin',
      version: '1.0.0',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('expected');
  });

  it('rejects an artifact whose digest differs from the pinned digest', async () => {
    const artifact = signedArtifact();
    testState.storePublicKey = artifact.publicKeyPem;
    stubStore(
      { ok: true, body: entitlementBody(artifact) },
      { buffer: artifact.buffer, headers: storeArtifactHeaders(artifact) },
    );

    const result = await installPlugin({
      type: 'marketplace',
      listing: 'acme/private-plugin',
      sha256: '0'.repeat(64),
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('digest');
  });

  it('rejects an artifact that declares an invalid plugin name', async () => {
    const artifact = signedArtifact();
    testState.storePublicKey = artifact.publicKeyPem;
    testState.pkgOverride = { openpeeps: { namespace: '..', name: 'x' } };
    stubStore(
      { ok: true, body: entitlementBody(artifact) },
      { buffer: artifact.buffer, headers: storeArtifactHeaders(artifact) },
    );

    const result = await installPlugin({
      type: 'marketplace',
      listing: 'acme/private-plugin',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('invalid plugin name');
  });

  it('rejects an artifact that declares a different plugin than the listing', async () => {
    const artifact = signedArtifact();
    testState.storePublicKey = artifact.publicKeyPem;
    testState.pkgOverride = { name: '@other/plugin' };
    stubStore(
      { ok: true, body: entitlementBody(artifact) },
      { buffer: artifact.buffer, headers: storeArtifactHeaders(artifact) },
    );

    const result = await installPlugin({
      type: 'marketplace',
      listing: 'acme/private-plugin',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('declares plugin');
  });

  it('rejects a store tarball that contains a symlink', async () => {
    const stage = path.join(testState.pluginsDir, 'stage');
    await fs.mkdir(path.join(stage, 'plugin'), { recursive: true });
    await fs.writeFile(path.join(stage, 'plugin', 'package.json'), '{}');
    await fs.symlink('/etc/passwd', path.join(stage, 'evil-link'));
    const archivePath = path.join(testState.pluginsDir, 'symlink.tgz');
    realCpHolder.cp!.execFileSync(
      'tar',
      ['-czf', archivePath, 'plugin', 'evil-link'],
      { cwd: stage },
    );
    const artifact = signBuffer(
      await fs.readFile(archivePath),
      'acme/private-plugin',
      '1.0.0',
    );
    testState.storePublicKey = artifact.publicKeyPem;
    testState.useRealTar = true;
    stubStore(
      { ok: true, body: entitlementBody(artifact) },
      { buffer: artifact.buffer, headers: storeArtifactHeaders(artifact) },
    );

    const result = await installPlugin({
      type: 'marketplace',
      listing: 'acme/private-plugin',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('disallowed entry');
    await expect(
      fs.access(path.join(testState.pluginsDir, 'acme')),
    ).rejects.toThrow();
  });

  it('rejects a store tarball that escapes with a parent-directory path', async () => {
    // The archive is crafted byte-for-byte: busybox tar (alpine CI)
    // rewrites `../evil.txt` sources to a normalized `evil.txt` member at
    // archive time, so a system-tar fixture would not carry the
    // parent-directory path on that platform.
    const archiveBuffer = buildTarGzip([
      { name: 'plugin/', type: 'dir' },
      { name: 'plugin/package.json', content: '{}' },
      { name: '../evil.txt', content: 'evil' },
    ]);
    const artifact = signBuffer(archiveBuffer, 'acme/private-plugin', '1.0.0');
    testState.storePublicKey = artifact.publicKeyPem;
    testState.useRealTar = true;
    stubStore(
      { ok: true, body: entitlementBody(artifact) },
      { buffer: artifact.buffer, headers: storeArtifactHeaders(artifact) },
    );

    const result = await installPlugin({
      type: 'marketplace',
      listing: 'acme/private-plugin',
    });

    // Whatever the platform's tar does with the member, the install must
    // fail and nothing may escape the throwaway extract dir: tar
    // implementations that keep `..` in listings trigger the pre-extract
    // guard, while busybox normalizes the member into the sandbox that
    // installPlugin cleans up on failure.
    expect(result.success).toBe(false);
    await expect(
      fs.access(path.join(testState.pluginsDir, 'acme')),
    ).rejects.toThrow();
    await expect(
      fs.access(path.join(testState.pluginsDir, 'evil.txt')),
    ).rejects.toThrow();
  });

  it('rejects a store tarball listing a parent-directory path before extraction', async () => {
    const archiveBuffer = buildTarGzip([
      { name: 'plugin/', type: 'dir' },
      { name: 'plugin/package.json', content: '{}' },
      { name: '../evil.txt', content: 'evil' },
    ]);
    const artifact = signBuffer(archiveBuffer, 'acme/private-plugin', '1.0.0');
    testState.storePublicKey = artifact.publicKeyPem;
    // Listings that keep `..` verbatim (GNU/BSD tar). Driven through the
    // mock because busybox strips `..` from listings, which would leave
    // the guard's parsing path untested on alpine CI.
    testState.tarListing = {
      verbose: [
        'drwxr-xr-x root/root         0 2026-11-10 00:00 plugin/',
        '-rw-r--r-- root/root         3 2026-11-10 00:00 plugin/package.json',
        '-rw-r--r-- root/root         4 2026-11-10 00:00 ../evil.txt',
      ].join('\n'),
      names: ['plugin/', 'plugin/package.json', '../evil.txt'].join('\n'),
    };
    stubStore(
      { ok: true, body: entitlementBody(artifact) },
      { buffer: artifact.buffer, headers: storeArtifactHeaders(artifact) },
    );

    const result = await installPlugin({
      type: 'marketplace',
      listing: 'acme/private-plugin',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('disallowed path');
    await expect(
      fs.access(path.join(testState.pluginsDir, 'acme')),
    ).rejects.toThrow();
  });

  it('rejects a store tarball that exceeds the download size limit', async () => {
    const artifact = signedArtifact();
    testState.storePublicKey = artifact.publicKeyPem;
    stubStore(
      { ok: true, body: entitlementBody(artifact) },
      {
        buffer: Buffer.alloc(100 * 1024 * 1024 + 1),
        headers: storeArtifactHeaders(artifact),
      },
    );

    const result = await installPlugin({
      type: 'marketplace',
      listing: 'acme/private-plugin',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('size limit');
  });

  it('extracts without preserving ownership or permissions', async () => {
    const artifact = signedArtifact();
    testState.storePublicKey = artifact.publicKeyPem;
    stubStore(
      { ok: true, body: entitlementBody(artifact) },
      { buffer: artifact.buffer, headers: storeArtifactHeaders(artifact) },
    );

    const result = await installPlugin({
      type: 'marketplace',
      listing: 'acme/private-plugin',
    });

    expect(result.success).toBe(true);
    const extract = testState.spawnCalls.find(
      ({ command, args }) => command === 'tar' && args[0] === '-xzf',
    );
    expect(extract?.args).toContain('--no-same-owner');
    expect(extract?.args).toContain('--no-same-permissions');
  });

  it('self-heal verifies against the digest pinned at install time', async () => {
    testState.storedConfigRows.push({
      key: 'openpeeps-installed-plugins',
      body: {
        'acme/private-plugin': {
          source: `store:acme/private-plugin@1.0.0#${'f'.repeat(64)}`,
          requiresAuth: false,
          installedAt: '2026-01-01T00:00:00.000Z',
        },
      },
    });
    const artifact = signedArtifact();
    testState.storePublicKey = artifact.publicKeyPem;
    stubStore(
      { ok: true, body: entitlementBody(artifact) },
      { buffer: artifact.buffer, headers: storeArtifactHeaders(artifact) },
    );

    const failures = await selfHealInstalledPlugins();

    expect(failures['acme/private-plugin']).toContain('digest');
  });
});
