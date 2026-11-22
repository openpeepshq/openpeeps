import fs from 'node:fs/promises';
import { mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createWriteStream } from 'node:fs';
import { pathExists, emptyDir } from 'fs-extra';
import { ZipArchive } from 'archiver';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CoreConfig, CommunityConfig } from '@openpeepshq/common/types';
import { buildStoredZip } from '../testUtils/extractZip';

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

vi.mock('../posts/eventOccurrences', () => ({
  backfillMissingEventOccurrences: vi.fn(async () => 0),
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
import { createBackup, extractZipArchive, restoreBackups } from './index';
import { extractZipForTest } from '../testUtils/extractZip';
import { extractWithNodeStreamZip } from './extractWithNodeStreamZip';

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
    const archive = new ZipArchive();
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
    await extractZipForTest(zipPath, extractDir);

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
    await extractZipForTest(zipPath, extractDir);

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

// The ENOENT→fallback-window test below only applies when the unzip CLI is
// absent (as on CI's node:24-alpine image) — that is what drives the
// node-stream-zip fallback it exercises. Detect once at collection time and
// skip (rather than silently pass) where the unzip CLI path is the one that
// runs. Probe PATH the same way `spawn('unzip')` resolves the binary.
const hasUnzip = await (async () => {
  const dirs = (process.env.PATH ?? '').split(path.delimiter).filter(Boolean);
  for (const dir of dirs) {
    if (
      await fs
        .access(path.join(dir, 'unzip'))
        .then(() => true)
        .catch(() => false)
    ) {
      return true;
    }
  }
  return false;
})();
const fallbackIt = hasUnzip ? it.skip : it;

// The unzip-CLI hostile-archive tests below exercise the production CLI
// branch, which `extractZipArchive` selects only on a Linux host with the unzip
// binary present (CI's node:24-alpine image ships no unzip, so they skip
// there; they run on a Linux dev host where the CLI actually runs).
const cliIt = hasUnzip && process.platform === 'linux' ? it : it.skip;

/** Poll until `p` exists. Condition-based kill timing: node-stream-zip opens
 *  the entry file before reading its body, so existence ⇒ the reader is open
 *  and a kill now aborts mid-read, deterministically — no fixed sleep for a
 *  pathologically slow runner to outrun. */
const waitForFile = async (p: string, timeoutMs = 5000): Promise<void> => {
  const start = Date.now();
  for (;;) {
    if (await pathExists(p)) return;
    if (Date.now() - start > timeoutMs) {
      throw new Error(`timed out waiting for ${p}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
};

describe('zip extraction (production node-stream-zip fallback)', () => {
  // These hostile-archive fixtures are extracted through the shipped
  // extractWithNodeStreamZip fallback (via the shared extractZipForTest helper),
  // so the security regression guards cover the code that actually ships.
  it('rejects path-traversal entry names instead of writing outside the target', async () => {
    const staging = path.join(testState.root, 'traversal-staging');
    await fs.mkdir(staging, { recursive: true });
    const zipPath = path.join(staging, 'evil.zip');
    await fs.writeFile(
      zipPath,
      buildStoredZip([
        { name: 'safe.txt', data: Buffer.from('safe'), mode: 0o100644 },
        { name: '../escaped.txt', data: Buffer.from('evil'), mode: 0o100644 },
      ]),
    );

    const extractDir = path.join(testState.root, 'traversal-extract');
    await fs.mkdir(extractDir, { recursive: true });

    await expect(extractZipForTest(zipPath, extractDir)).rejects.toThrow(
      /malicious entry/i,
    );
    expect(await pathExists(path.join(staging, 'escaped.txt'))).toBe(false);
    expect(await pathExists(path.join(extractDir, 'escaped.txt'))).toBe(false);
  });

  it('materializes symlink archive entries as regular files without escaping', async () => {
    const escapeTarget = path.join(testState.root, 'escaped-symlink.txt');
    const extractDir = path.join(testState.root, 'symlink-extract');
    await fs.mkdir(extractDir, { recursive: true });

    // Stored-entry zip whose entries include a symlink whose target points
    // outside the extraction directory (GHSA-jmr9-qjv8-65gv /
    // GHSA-7pqw-9j4j-h8q3 attack shapes: a symlink entry and, for the leaf
    // variant, a same-named regular file following it).
    const linkEntry = (name: string, data: string, mode: number) => ({
      name,
      data: Buffer.from(data, 'utf8'),
      mode,
    });
    const zipPath = path.join(testState.root, 'evil-symlinks.zip');
    await fs.writeFile(
      zipPath,
      buildStoredZip([
        linkEntry('link', '../escaped-symlink.txt', 0o120777),
        linkEntry('link', 'regular-file-content', 0o100644),
      ]),
    );

    await extractZipForTest(zipPath, extractDir);

    const stat = await fs.lstat(path.join(extractDir, 'link'));
    expect(stat.isSymbolicLink()).toBe(false);
    expect(stat.isFile()).toBe(true);
    expect(await fs.readFile(path.join(extractDir, 'link'), 'utf8')).toBe(
      'regular-file-content',
    );
    expect(await pathExists(escapeTarget)).toBe(false);
  });

  it('materializes a unique-named symlink entry as a regular file without escaping', async () => {
    // The GHSA-jmr9-qjv8-65gv extraction shape: a symlink whose own name is
    // unique (no same-named regular file replacing it). The sibling test pins
    // the GHSA-7pqw-9j4j-h8q3 leaf shape; this keeps both advisories' attack
    // shapes pinned if a future extractor ever re-gains symlink support.
    const escapeTarget = path.join(testState.root, 'escaped-uniqlink.txt');
    const extractDir = path.join(testState.root, 'uniq-symlink-extract');
    await fs.mkdir(extractDir, { recursive: true });

    const zipPath = path.join(testState.root, 'evil-uniq-symlink.zip');
    await fs.writeFile(
      zipPath,
      buildStoredZip([
        {
          name: 'uniqlink',
          data: Buffer.from('../escaped-uniqlink.txt', 'utf8'),
          mode: 0o120777,
        },
      ]),
    );

    await extractZipForTest(zipPath, extractDir);

    const stat = await fs.lstat(path.join(extractDir, 'uniqlink'));
    expect(stat.isSymbolicLink()).toBe(false);
    expect(stat.isFile()).toBe(true);
    expect(await fs.readFile(path.join(extractDir, 'uniqlink'), 'utf8')).toBe(
      '../escaped-uniqlink.txt',
    );
    expect(await pathExists(escapeTarget)).toBe(false);
  });

  it('aborts an in-flight extraction when kill() runs (timeout-path contract)', async () => {
    // Pins the deliberate kill() behavior change from the extract-zip
    // replacement: the old fallback kill was a no-op (the timed-out
    // extraction kept running to completion in the background); the new kill
    // closes the reader handle, which aborts the in-flight read — the extract
    // promise rejects with an fs error and may leave a partial file in the
    // extraction directory.
    const staging = path.join(testState.root, 'kill-staging');
    await fs.mkdir(staging, { recursive: true });
    const big = Buffer.alloc(64 * 1024 * 1024, 0x61);
    const zipPath = path.join(staging, 'big.zip');
    await fs.writeFile(
      zipPath,
      buildStoredZip([{ name: 'big.bin', data: big, mode: 0o100644 }]),
    );

    const extractDir = path.join(testState.root, 'kill-extract');
    await fs.mkdir(extractDir, { recursive: true });

    const extraction = extractWithNodeStreamZip(zipPath, extractDir);
    // Small archives extract in a few milliseconds; the 64 MiB stored entry
    // takes long enough that the kill lands mid-read (well after the reader
    // has opened, so this is the deterministic mid-read abort, not the
    // pre-open no-op pinned by the companion test). Wait for the entry file to
    // appear instead of a fixed sleep: existence ⇒ the reader is open (the
    // write opens the file before reading the body), so the kill deterministically
    // lands mid-read on runners of any speed.
    await waitForFile(path.join(extractDir, 'big.bin'));
    extraction.kill();

    // The abort rejects with an fs error (EBADF on the closed reader); pin
    // that it rejects with an fs error rather than resolving.
    await expect(extraction.promise).rejects.toMatchObject({
      code: expect.stringMatching(/^[A-Z]+$/),
    });

    // The aborted write leaves the entry truncated: the reader is closed
    // mid-read, so nothing can still be writing to the file — the size is
    // frozen and strictly below the full entry size. Asserted unconditionally
    // (the file exists at kill time: node-stream-zip opens it before reading
    // the 64 MiB body, and the wait above guarantees it was open). The restore
    // path's error handling tolerates a partial file.
    const aborted = await fs.stat(path.join(extractDir, 'big.bin'));
    expect(aborted.size).toBeGreaterThan(0);
    expect(aborted.size).toBeLessThan(big.length);
  });

  it('treats kill() before the reader is open as a no-op (early-kill race)', async () => {
    // Pins the pre-open window the round-4 review found: a kill before
    // node-stream-zip has finished opening the archive (read of the central
    // directory) used to either run to completion silently or — worse, in
    // 1.16.0 — crash the process via the library's unguarded `fs.close(null)`
    // err path. kill() now records the request and no-ops pre-open (nothing
    // is in flight to abort yet), so the extraction deterministically
    // completes instead of racing between resolve/reject/crash. A later kill
    // (once open) still aborts — the mid-read test above pins that.
    const staging = path.join(testState.root, 'early-kill-staging');
    await fs.mkdir(staging, { recursive: true });
    const zipPath = path.join(staging, 'early-kill.zip');
    // Deliberately small: fast to build and extract, and the pre-open
    // window is what this test isolates (kill fires on the same tick as
    // construction, before any read can complete).
    const small = Buffer.alloc(4 * 1024 * 1024, 0x62);
    await fs.writeFile(
      zipPath,
      buildStoredZip([{ name: 'small.bin', data: small, mode: 0o100644 }]),
    );

    const extractDir = path.join(testState.root, 'early-kill-extract');
    await fs.mkdir(extractDir, { recursive: true });

    const extraction = extractWithNodeStreamZip(zipPath, extractDir);
    // Kill on the same tick as construction — before `open` can flip.
    extraction.kill();

    await expect(extraction.promise).resolves.toBeUndefined();
    expect(
      await fs.stat(path.join(extractDir, 'small.bin')).then((s) => s.size),
    ).toBe(small.length);
  });

  fallbackIt(
    'lets a kill in the unzip-missing (ENOENT→fallback) window run to completion',
    async () => {
      // Pins the window-kill semantics of the extractZipArchive composition
      // (round-6 review item): with the unzip CLI unavailable — as on CI's
      // node:24-alpine image, which ships no unzip — the spawn rejects with
      // ENOENT and the composition falls back to node-stream-zip. A kill that
      // lands in that ENOENT→fallback window fires before the fallback's reader
      // is open, so the pre-open no-op rule (pinned above against the fallback
      // directly) applies: nothing is in flight to abort, and the extraction
      // deterministically resolves with the full file. Skipped at collection
      // time where the unzip CLI exists (the hasUnzip probe above), since the
      // CLI path (SIGKILL, no fallback) is the one exercised there.
      const staging = path.join(testState.root, 'fallback-window-staging');
      await fs.mkdir(staging, { recursive: true });
      const big = Buffer.alloc(16 * 1024 * 1024, 0x63);
      const zipPath = path.join(staging, 'fallback-window.zip');
      await fs.writeFile(
        zipPath,
        buildStoredZip([{ name: 'big.bin', data: big, mode: 0o100644 }]),
      );

      const extractDir = path.join(testState.root, 'fallback-window-extract');
      await fs.mkdir(extractDir, { recursive: true });

      const extraction = extractZipArchive(zipPath, extractDir);
      // Same tick as construction: the unzip spawn has not even been launched
      // yet, let alone hit ENOENT — the kill lands squarely in the window.
      extraction.kill();

      await expect(extraction.promise).resolves.toBeUndefined();
      expect(
        await fs.stat(path.join(extractDir, 'big.bin')).then((s) => s.size),
      ).toBe(big.length);
    },
  );
});

describe('extractZipArchive platform dispatch', () => {
  it('routes to the node-stream-zip fallback on non-Linux platforms', async () => {
    // Pins the `process.platform !== 'linux'` dispatch: every other test
    // exercises either the unzip CLI (Linux hosts) or the ENOENT fallback,
    // so this composition branch would regress silently if the platform
    // check were inverted or dropped. Driving it on a Linux runner by
    // mocking the platform getter (no CLI spawn happens on this path).
    const staging = path.join(testState.root, 'darwin-dispatch-staging');
    await fs.mkdir(staging, { recursive: true });
    const zipPath = path.join(staging, 'darwin.zip');
    await fs.writeFile(
      zipPath,
      buildStoredZip([
        {
          name: 'entry.txt',
          data: Buffer.from('darwin-path'),
          mode: 0o100644,
        },
      ]),
    );

    const extractDir = path.join(testState.root, 'darwin-dispatch-extract');
    await fs.mkdir(extractDir, { recursive: true });

    const platformSpy = vi
      .spyOn(process, 'platform', 'get')
      .mockReturnValue('darwin');
    try {
      const extraction = extractZipArchive(zipPath, extractDir);
      await expect(extraction.promise).resolves.toBeUndefined();
    } finally {
      platformSpy.mockRestore();
    }

    expect(await fs.readFile(path.join(extractDir, 'entry.txt'), 'utf8')).toBe(
      'darwin-path',
    );
    // Nothing leaked outside the extraction directory.
    expect(await pathExists(path.join(staging, 'entry.txt'))).toBe(false);
  });
});

describe('extractWithUnzipCli failure paths (stubbed unzip on PATH)', () => {
  // The production unzip-CLI path (extractZipArchive's primary branch on
  // Linux) has no regression coverage of its failure modes: a non-zero exit
  // with stderr detail, and a SIGKILL mid-extract (the kill() a timeout
  // fires). Both are pinned here by driving the real composition with a
  // stubbed `unzip` first on PATH.
  const makeUnzipShim = (script: string): string => {
    const shimDir = mkdtempSync(path.join(os.tmpdir(), 'unzip-shim-'));
    const shim = path.join(shimDir, 'unzip');
    writeFileSync(shim, `#!/bin/sh\n${script}\n`, { mode: 0o755 });
    return shimDir;
  };

  it.each([
    [
      'exit-2 with stderr detail',
      'echo "cannot create /x: No such file or directory"\nexit 2',
    ],
    ['exit-9', 'exit 9'],
  ])(
    'rejects with the "unzip exited with code N" error contract (%s)',
    async (_label, script) => {
      const shimDir = makeUnzipShim(script);
      const oldPath = process.env.PATH;
      process.env.PATH = `${shimDir}${path.delimiter}${oldPath}`;
      try {
        const staging = path.join(testState.root, 'unzip-fail-staging');
        await fs.mkdir(staging, { recursive: true });
        const zipPath = path.join(staging, 'whatever.zip');
        await fs.writeFile(zipPath, Buffer.from('not a real zip'));

        const extractDir = path.join(testState.root, 'unzip-fail-extract');
        await fs.mkdir(extractDir, { recursive: true });

        const extraction = extractZipArchive(zipPath, extractDir);
        // The stub's non-zero exit is not an ENOENT window, so the
        // composition must surface the CLI error verbatim — no fallback.
        await expect(extraction.promise).rejects.toThrow(
          /^unzip exited with code [29](?:: .+)?$/,
        );
      } finally {
        process.env.PATH = oldPath;
      }
    },
  );

  it('surfaces a SIGKILL mid-extract as an error (timeout-kill path)', async () => {
    // The kill() the restore path fires on timeout SIGKILLs a still-running
    // unzip; pin that the composition rejects on that (rather than
    // resolving or hanging). The shim holds for a few seconds so the kill
    // lands mid-run (the shim ignores its args, so the archive content is
    // irrelevant — only that the process is alive when kill() fires).
    const shimDir = makeUnzipShim('sleep 3\nexit 0');
    const oldPath = process.env.PATH;
    process.env.PATH = `${shimDir}${path.delimiter}${oldPath}`;
    try {
      const staging = path.join(testState.root, 'unzip-kill-staging');
      await fs.mkdir(staging, { recursive: true });
      const zipPath = path.join(staging, 'hold.zip');
      await fs.writeFile(zipPath, Buffer.from('x'));

      const extractDir = path.join(testState.root, 'unzip-kill-extract');
      await fs.mkdir(extractDir, { recursive: true });

      const extraction = extractZipArchive(zipPath, extractDir);
      // Let the shim start before the kill, so it is mid-run when it fires.
      await new Promise((resolve) => setTimeout(resolve, 100));
      extraction.kill();

      // A SIGKILL leaves `code` null and `signalCode` 'SIGKILL', so the
      // close handler rejects with "unzip exited with code null".
      await expect(extraction.promise).rejects.toThrow(
        /unzip exited with code/,
      );
    } finally {
      process.env.PATH = oldPath;
    }
  });

  it('resolves on code 1 (unzip warns but continues) — no error, no fallback', async () => {
    // unzip exits 1 for warnings (e.g. "zipped older than file"). The
    // production code treats 0 *and* 1 as success; pin that boundary.
    const shimDir = makeUnzipShim(
      'echo "warning: 1 file could be more safely compressed" >&2\nexit 1',
    );
    const oldPath = process.env.PATH;
    process.env.PATH = `${shimDir}${path.delimiter}${oldPath}`;
    try {
      const staging = path.join(testState.root, 'unzip-warn-staging');
      await fs.mkdir(staging, { recursive: true });
      const zipPath = path.join(staging, 'warn.zip');
      await fs.writeFile(zipPath, Buffer.from('x'));

      const extractDir = path.join(testState.root, 'unzip-warn-extract');
      await fs.mkdir(extractDir, { recursive: true });

      const extraction = extractZipArchive(zipPath, extractDir);
      await expect(extraction.promise).resolves.toBeUndefined();
    } finally {
      process.env.PATH = oldPath;
    }
  });
});

describe('buildStoredZip (hostile-fixture helper contract)', () => {
  // The hostile-archive tests rely on buildStoredZip producing well-formed
  // zips; pin the helper's contract directly so a fixture that silently
  // malforms (bad CRC, wrong size) fails as a fixture error, not as a
  // confusing library-side extraction error.
  it('round-trips a valid one-entry zip through the production extractor', async () => {
    const payload = Buffer.from('round-trip-payload-123');
    const staging = path.join(testState.root, 'storedzip-roundtrip');
    await fs.mkdir(staging, { recursive: true });
    const zipPath = path.join(staging, 'one.zip');
    await fs.writeFile(
      zipPath,
      buildStoredZip([{ name: 'one.txt', data: payload, mode: 0o100644 }]),
    );

    const extractDir = path.join(testState.root, 'storedzip-roundtrip-out');
    await fs.mkdir(extractDir, { recursive: true });
    await extractZipForTest(zipPath, extractDir);

    expect(await fs.readFile(path.join(extractDir, 'one.txt'))).toEqual(
      payload,
    );
  });

  it('rejects a corrupted (CRC-mismatching) zip instead of writing corrupt data', async () => {
    const staging = path.join(testState.root, 'storedzip-corrupt');
    await fs.mkdir(staging, { recursive: true });
    const zipPath = path.join(staging, 'corrupt.zip');
    // Corrupt the local-header CRC (bytes 14–17) so it mismatches the payload
    // the extractor verifies against, without otherwise changing the layout.
    const buf = buildStoredZip([
      { name: 'one.txt', data: Buffer.from('corrupt-me'), mode: 0o100644 },
    ]);
    buf[14] ^= 0xff;
    buf[15] ^= 0xff;
    buf[16] ^= 0xff;
    buf[17] ^= 0xff;
    await fs.writeFile(zipPath, buf);

    const extractDir = path.join(testState.root, 'storedzip-corrupt-out');
    await fs.mkdir(extractDir, { recursive: true });
    await expect(extractZipForTest(zipPath, extractDir)).rejects.toThrow(
      /crc/i,
    );
  });
});

describe('unzip-CLI hostile-archive behavior (real unzip, Linux)', () => {
  // Pins what the *production* unzip-CLI path (extractZipArchive's primary
  // branch on Linux, the path prod images run — Dockerfile installs unzip)
  // does with the same hostile fixtures the node-stream-zip fallback tests
  // cover. Complements the failure-path tests above (which pin the error
  // contract via a stubbed unzip); here the real unzip runs. Skips where the
  // CLI is absent (CI's node:24-alpine image) or off-Linux.
  //
  // Layout: the extraction dir is a child of `staging`, so a `../` entry that
  // escaped the destination would land in `staging` itself — the containment
  // boundary the assertions check. What is pinned (Info-ZIP UnZip 6.00): `../`
  // entry names are sanitized into the destination (no escape), and symlink
  // archive entries never yield anything *outside* the extraction directory.
  // How a unique-named symlink is materialized *inside* the destination is
  // build-dependent (Debian 6.00 writes a regular file; some builds write a
  // real symlink with an unvalidated target), so the assertion is containment,
  // not materialization — the property that actually matters for the advisory.
  const containment = async (
    boundary: string,
    expected: Array<'evil.zip' | 'extract'>,
  ) =>
    expect((await fs.readdir(boundary)).sort()).toEqual([...expected].sort());

  cliIt(
    'sanitizes a ../ traversal entry into the destination (no escape)',
    async () => {
      const staging = path.join(testState.root, 'unzipcli-traversal');
      const extractDir = path.join(staging, 'extract');
      await fs.mkdir(extractDir, { recursive: true });
      const zipPath = path.join(staging, 'evil.zip');
      await fs.writeFile(
        zipPath,
        buildStoredZip([
          { name: 'safe.txt', data: Buffer.from('safe'), mode: 0o100644 },
          {
            name: '../escaped.txt',
            data: Buffer.from('evil'),
            mode: 0o100644,
          },
        ]),
      );

      const extraction = extractZipArchive(zipPath, extractDir);
      await expect(extraction.promise).resolves.toBeUndefined();

      // Containment: `../` did not escape the extraction dir into staging
      // (staging holds only the archive and the extraction dir).
      await containment(staging, ['evil.zip', 'extract']);
      // The traversal entry was sanitized into the destination and its payload
      // kept: unzip warns "skipped ../ path component(s)" and writes the leaf.
      const sanitized = path.join(extractDir, 'escaped.txt');
      expect(await pathExists(sanitized)).toBe(true);
      expect(await fs.readFile(sanitized, 'utf8')).toBe('evil');
      // It landed as a regular file, not a symlink (no directory escape via a
      // planted link).
      expect((await fs.lstat(sanitized)).isSymbolicLink()).toBe(false);
    },
  );

  cliIt(
    'never writes outside the extraction directory for symlink entries (CVE leaf + unique shapes)',
    async () => {
      // Both symlink shapes from the GHSA advisories: a same-named regular
      // file following a symlink (CVE-2026-19693 leaf) and a unique-named
      // symlink (CVE-2026-56876). Whatever the CLI materializes inside the
      // destination, nothing may appear outside it (in staging).
      const staging = path.join(testState.root, 'unzipcli-symlink');
      const extractDir = path.join(staging, 'extract');
      await fs.mkdir(extractDir, { recursive: true });
      const zipPath = path.join(staging, 'evil.zip');
      await fs.writeFile(
        zipPath,
        buildStoredZip([
          {
            name: 'link',
            data: Buffer.from('../escaped-symlink.txt', 'utf8'),
            mode: 0o120777,
          },
          {
            name: 'link',
            data: Buffer.from('regular-file-content', 'utf8'),
            mode: 0o100644,
          },
          {
            name: 'uniqlink',
            data: Buffer.from('../escaped-uniqlink.txt', 'utf8'),
            mode: 0o120777,
          },
        ]),
      );

      const extraction = extractZipArchive(zipPath, extractDir);
      await expect(extraction.promise).resolves.toBeUndefined();

      // Containment: no escaped-symlink.txt / escaped-uniqlink.txt beside the
      // archive and extraction dir.
      await containment(staging, ['evil.zip', 'extract']);
      // Both entries materialized as regular (non-symlink) files inside the
      // destination: the leaf as its regular-file payload, the unique link as
      // its target text. This is the build-independent safety property — no
      // real symlink is created from a hostile archive.
      for (const [name, content] of [
        ['link', 'regular-file-content'],
        ['uniqlink', '../escaped-uniqlink.txt'],
      ] as const) {
        const stat = await fs.lstat(path.join(extractDir, name));
        expect(stat.isSymbolicLink()).toBe(false);
        expect(stat.isFile()).toBe(true);
        expect(await fs.readFile(path.join(extractDir, name), 'utf8')).toBe(
          content,
        );
      }
    },
  );
});
