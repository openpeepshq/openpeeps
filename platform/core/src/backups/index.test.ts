import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createWriteStream } from 'node:fs';
import { pathExists, emptyDir } from 'fs-extra';
import archiver from 'archiver';
import extract from 'extract-zip';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CoreConfig, CommunityConfig } from '@openpeepshq/common/types';

const testState = vi.hoisted(() => ({
  root: `/tmp/openpeeps-backups-test-${process.pid}`,
  pluginsPath: `/tmp/openpeeps-backups-test-${process.pid}/live/plugins`,
  zipPaths: [] as string[],
}));

vi.mock('../log', () => ({
  logger: () => ({
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
  }),
}));

vi.mock('../db', () => ({
  collectionInfos: { accounts: { type: 'document', name: 'accounts' } },
}));

vi.mock('../config', () => ({
  config: vi.fn(),
  communityConfig: vi.fn(),
  defaultConfig: {
    get plugins() {
      return {
        path: testState.pluginsPath,
        rootPackageJsonPath: testState.root + '/live/package.json',
      };
    },
  },
}));

vi.mock('../db/migration/importCollections', () => ({
  exportAllPostgresCollections: vi.fn(),
  importAllPostgresCollections: vi.fn(async () => ({ total: 1 })),
}));

vi.mock('../db/pg/migrate', () => ({
  getLatestSchemaVersion: vi.fn(async () => '0001_test'),
}));

vi.mock('../db/replaceOrigin', () => ({
  replaceOrigin: vi.fn(async () => undefined),
}));

vi.mock('../roles', () => ({
  setDefaultRoles: vi.fn(async () => undefined),
}));

vi.mock('../server', () => ({
  serverRootUrl: vi.fn(async () => 'http://localhost:8080'),
}));

// The real peer re-linker, without dragging in the plugins barrel's
// events/i18n module chain.
vi.mock('../plugins', async () => {
  const actual =
    await vi.importActual<typeof import('../plugins/install')>(
      '../plugins/install',
    );
  return { linkHostPeerDependencies: actual.linkHostPeerDependencies };
});

import { config, communityConfig } from '../config';
import { exportAllPostgresCollections } from '../db/migration/importCollections';
import { createBackup, restoreBackups } from './index';

const live = path.join(testState.root, 'live');
const pluginDir = path.join(live, 'plugins', 'acme', 'plug');

const createFixture = async () => {
  await emptyDir(live);
  await fs.mkdir(path.join(live, 'media'), { recursive: true });
  await fs.writeFile(path.join(live, 'media', 'upload.txt'), 'media');
  await fs.mkdir(path.join(live, 'logs'), { recursive: true });
  await fs.writeFile(path.join(live, 'logs', 'app.log'), 'log');
  await fs.mkdir(path.join(pluginDir, 'dist'), { recursive: true });
  await fs.mkdir(path.join(pluginDir, 'node_modules'), { recursive: true });
  await fs.writeFile(
    path.join(pluginDir, 'package.json'),
    JSON.stringify({ name: '@acme/plug', peerDependencies: { zod: '^4.0.0' } }),
  );
  await fs.writeFile(
    path.join(pluginDir, 'dist', 'index.js'),
    'console.log(1)',
  );
  // Simulate a peer symlink anchored at a package tree of the backup source
  // image (outside the plugins directory, as linkHostPeerDependencies makes).
  await fs.mkdir(path.join(live, 'old-image-pkg'), { recursive: true });
  await fs.writeFile(
    path.join(live, 'old-image-pkg', 'package.json'),
    JSON.stringify({ name: 'stale-zod' }),
  );
  await fs.symlink(
    path.join(live, 'old-image-pkg'),
    path.join(pluginDir, 'node_modules', 'zod'),
  );
};

const zipDirectory = (sourceDir: string, zipPath: string) =>
  new Promise<void>((resolve, reject) => {
    const output = createWriteStream(zipPath);
    const archive = archiver('zip');
    output.on('close', () => resolve());
    output.on('error', reject);
    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(sourceDir, false);
    void archive.finalize();
  });

beforeEach(async () => {
  await createFixture();
  testState.pluginsPath = path.join(live, 'plugins');
  vi.mocked(config).mockResolvedValue({
    media: { storage: { params: { path: path.join(live, 'media') } } },
    logs: { local: { path: path.join(live, 'logs') } },
    server: { host: 'community.example.com' },
  } as unknown as CoreConfig);
  vi.mocked(communityConfig).mockResolvedValue({
    info: { name: 'mycommunity' },
  } as unknown as CommunityConfig);
  vi.mocked(exportAllPostgresCollections).mockImplementation(async (dir) => {
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'accounts.jsonl'), '{"id":"1"}\n');
  });
});

afterAll(async () => {
  await Promise.all(
    testState.zipPaths.map((zipPath) =>
      fs.rm(zipPath, { force: true }).catch(() => undefined),
    ),
  );
  await fs.rm(testState.root, { recursive: true, force: true });
});

describe('createBackup', () => {
  it('includes database, media, logs, and plugins in the archive', async () => {
    const name = await createBackup();
    const zipPath = path.join(os.tmpdir(), `${name}.zip`);
    testState.zipPaths.push(zipPath);

    const extractDir = path.join(testState.root, `extracted-${name}`);
    await extract(zipPath, { dir: extractDir });

    expect(await pathExists(path.join(extractDir, 'metadata.json'))).toBe(true);
    expect(
      await pathExists(path.join(extractDir, 'collections', 'accounts.jsonl')),
    ).toBe(true);
    expect(await pathExists(path.join(extractDir, 'media', 'upload.txt'))).toBe(
      true,
    );
    expect(await pathExists(path.join(extractDir, 'logs', 'app.log'))).toBe(
      true,
    );
    expect(
      await pathExists(
        path.join(extractDir, 'plugins', 'acme', 'plug', 'package.json'),
      ),
    ).toBe(true);
    expect(
      await pathExists(
        path.join(extractDir, 'plugins', 'acme', 'plug', 'dist', 'index.js'),
      ),
    ).toBe(true);
  });

  it('omits the plugins entry when the plugins directory does not exist', async () => {
    testState.pluginsPath = path.join(live, 'does-not-exist');

    const name = await createBackup();
    const zipPath = path.join(os.tmpdir(), `${name}.zip`);
    testState.zipPaths.push(zipPath);

    const extractDir = path.join(testState.root, `extracted-${name}`);
    await extract(zipPath, { dir: extractDir });

    expect(await pathExists(path.join(extractDir, 'plugins'))).toBe(false);
    expect(await pathExists(path.join(extractDir, 'media', 'upload.txt'))).toBe(
      true,
    );
  });
});

describe('restoreBackups', () => {
  it('restores plugins and re-anchors peer symlinks to the current host tree', async () => {
    const name = await createBackup();
    const zipPath = path.join(os.tmpdir(), `${name}.zip`);
    testState.zipPaths.push(zipPath);

    await restoreBackups(zipPath);

    expect(await pathExists(path.join(pluginDir, 'package.json'))).toBe(true);
    expect(await pathExists(path.join(pluginDir, 'dist', 'index.js'))).toBe(
      true,
    );
    // The stale link at the backup source image must be replaced by a link
    // into the current host package tree (a real `zod` package here).
    const zodPkg = JSON.parse(
      await fs.readFile(
        path.join(pluginDir, 'node_modules', 'zod', 'package.json'),
        'utf8',
      ),
    );
    expect(zodPkg.name).toBe('zod');
    expect(await pathExists(path.join(live, 'media', 'upload.txt'))).toBe(true);
  });

  it('leaves existing plugins in place when the backup predates plugin archives', async () => {
    const staging = path.join(testState.root, 'legacy-stage');
    await emptyDir(staging);
    await fs.mkdir(path.join(staging, 'collections'), { recursive: true });
    await fs.writeFile(
      path.join(staging, 'collections', 'accounts.jsonl'),
      '{"id":"1"}\n',
    );
    await fs.mkdir(path.join(staging, 'media'), { recursive: true });
    await fs.mkdir(path.join(staging, 'logs'), { recursive: true });
    await fs.writeFile(
      path.join(staging, 'metadata.json'),
      JSON.stringify({
        databaseType: 'postgres',
        config: { hostname: 'community.example.com' },
      }),
    );
    const zipPath = path.join(testState.root, 'legacy.zip');
    await zipDirectory(staging, zipPath);

    const marker = path.join(live, 'plugins', 'legacy-plugin', 'keep.txt');
    await fs.mkdir(path.dirname(marker), { recursive: true });
    await fs.writeFile(marker, 'keep');

    await restoreBackups(zipPath);

    expect(await pathExists(marker)).toBe(true);
  });
});
