#!/usr/bin/env node
/**
 * Build multi-version component gallery into examples/component-gallery/dist.
 *
 * Candidate refs: main, staging, last 5 *-RELEASE tags.
 * A ref is included only if it contains examples/component-gallery/package.json.
 *
 * Env:
 *   GALLERY_LOCAL=1  — build only the working tree as "main"
 *   GALLERY_STRICT=1 — fail if main/staging missing (CI)
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(SITE_ROOT, '../..');
const DIST = path.join(SITE_ROOT, 'dist');
const BUILD = path.join(SITE_ROOT, '.build');
const GALLERY_PKG = 'examples/component-gallery/package.json';

const localOnly = process.env.GALLERY_LOCAL === '1';
const strict =
  process.env.GALLERY_STRICT === '1' ||
  (!localOnly && process.env.CI === 'true') ||
  (!localOnly && process.env.GALLERY_STRICT !== '0');

const log = (msg) => console.error(msg);

const git = (args, cwd = REPO_ROOT) =>
  spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });

const refExists = (ref) =>
  git(['rev-parse', '--verify', '--quiet', ref]).status === 0;

const resolveBranchRef = (name) => {
  if (refExists(name)) return name;
  if (refExists(`origin/${name}`)) return `origin/${name}`;
  return null;
};

const listReleaseTags = () => {
  const r = git(['tag', '-l', '*-RELEASE', '--sort=-creatordate']);
  if (r.status !== 0)
    throw new Error(`git tag failed: ${r.stderr || r.stdout}`);
  return r.stdout
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 5);
};

const refHasGallery = (ref) =>
  git(['cat-file', '-e', `${ref}:${GALLERY_PKG}`]).status === 0;

const run = (command, args, cwd, env = {}) => {
  const result = spawnSync(command, args, {
    cwd,
    env: { ...process.env, ...env },
    encoding: 'utf8',
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed in ${cwd}`);
  }
};

const writeRootFiles = (versions, defaultId) => {
  writeFileSync(
    path.join(DIST, 'versions.json'),
    JSON.stringify(
      {
        default: defaultId,
        versions: versions.map((v) => ({
          id: v.id,
          label: v.label,
          path: `/${v.id}/`,
        })),
      },
      null,
      2,
    ) + '\n',
  );

  writeFileSync(
    path.join(DIST, 'index.html'),
    `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="refresh" content="0; url=/${defaultId}/" />
    <link rel="canonical" href="/${defaultId}/" />
    <title>OpenPeeps Components</title>
    <script>location.replace('/${defaultId}/')</script>
  </head>
  <body>
    <p>Redirecting to <a href="/${defaultId}/">/${defaultId}/</a>…</p>
  </body>
</html>
`,
  );
};

const buildInRepo = ({ id, label, cwd }) => {
  const outDir = path.join(DIST, id);
  const base = `/${id}/`;
  log(`\n=== building ${label} base=${base} cwd=${cwd} ===`);

  run('pnpm', ['--filter', '@openpeepshq/react...', 'build'], cwd);

  run(
    'pnpm',
    ['--filter', '@openpeepshq/component-gallery', 'run', 'build:app'],
    cwd,
    {
      GALLERY_BASE: base,
      GALLERY_OUT_DIR: outDir,
      GALLERY_VERSION_ID: id,
      GALLERY_VERSION_LABEL: label,
    },
  );
};

const buildVersion = ({ id, label, ref, workdir }) => {
  if (workdir) {
    buildInRepo({ id, label, cwd: REPO_ROOT });
    return;
  }

  const worktreePath = path.join(BUILD, id);
  rmSync(worktreePath, { recursive: true, force: true });
  mkdirSync(BUILD, { recursive: true });

  const add = git(['worktree', 'add', '--detach', worktreePath, ref]);
  if (add.status !== 0) {
    throw new Error(
      `git worktree add failed for ${ref}: ${add.stderr || add.stdout}`,
    );
  }

  try {
    run('pnpm', ['install', '--frozen-lockfile'], worktreePath);
    buildInRepo({ id, label, cwd: worktreePath });
  } finally {
    git(['worktree', 'remove', '--force', worktreePath]);
  }
};

const main = () => {
  rmSync(DIST, { recursive: true, force: true });
  mkdirSync(DIST, { recursive: true });

  /** @type {{ id: string, label: string, ref: string, workdir?: boolean }[]} */
  const candidates = [];

  if (localOnly) {
    candidates.push({
      id: 'main',
      label: 'main',
      ref: 'HEAD',
      workdir: true,
    });
  } else {
    for (const name of ['main', 'staging']) {
      const ref = resolveBranchRef(name);
      if (!ref) {
        const msg = `missing git ref for branch ${name}`;
        if (strict) throw new Error(msg);
        log(`warn: ${msg} — skipping`);
        continue;
      }
      candidates.push({ id: name, label: name, ref });
    }

    listReleaseTags().forEach((tag, index) => {
      candidates.push({
        id: tag,
        label: index === 0 ? `${tag} (stable)` : tag,
        ref: tag,
      });
    });
  }

  const versions = [];
  for (const candidate of candidates) {
    if (candidate.workdir) {
      if (!existsSync(path.join(SITE_ROOT, 'package.json'))) {
        throw new Error('Working tree is missing examples/component-gallery');
      }
      versions.push(candidate);
      continue;
    }
    if (!refHasGallery(candidate.ref)) {
      log(`skip ${candidate.id}: no ${GALLERY_PKG} on ${candidate.ref}`);
      continue;
    }
    versions.push(candidate);
  }

  if (versions.length === 0) {
    if (existsSync(path.join(SITE_ROOT, 'package.json'))) {
      log(
        'no gated refs contain the gallery — falling back to working tree as main',
      );
      versions.push({
        id: 'main',
        label: 'main',
        ref: 'HEAD',
        workdir: true,
      });
    } else {
      throw new Error('No component gallery versions to build');
    }
  }

  for (const v of versions) buildVersion(v);

  const defaultId =
    versions.find((v) => v.label.endsWith('(stable)'))?.id ??
    versions.find((v) => v.id !== 'main' && v.id !== 'staging')?.id ??
    versions[0].id;

  writeRootFiles(versions, defaultId);
  log(`\ndone: ${versions.length} version(s) → ${DIST}`);
  log(`default: /${defaultId}/`);
};

try {
  main();
} catch (err) {
  console.error(err.message || err);
  process.exit(1);
}
