#!/usr/bin/env node
/**
 * Build multi-version React docs SPA into docs-site/dist.
 *
 * Versions: main, staging, last 5 *-RELEASE tags (newest labeled "(stable)").
 *
 * Env:
 *   DOCS_LOCAL=1  — build only the working tree as "main"
 *   DOCS_STRICT=1 — fail if main/staging missing (CI)
 */
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(SITE_ROOT, '..');
const DIST = path.join(SITE_ROOT, 'dist');
const BUILD = path.join(SITE_ROOT, '.build');
const PUBLIC_LOGO = path.join(
  REPO_ROOT,
  'platform/web/public/img/logo-small.png',
);

const localOnly = process.env.DOCS_LOCAL === '1';
const strict =
  process.env.DOCS_STRICT === '1' ||
  (!localOnly && process.env.CI === 'true') ||
  (!localOnly && process.env.DOCS_STRICT !== '0');

const log = (msg) => console.error(msg);

const git = (args) =>
  spawnSync('git', args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });

const refExists = (ref) => git(['rev-parse', '--verify', '--quiet', ref]).status === 0;

const resolveBranchRef = (name) => {
  if (refExists(name)) return name;
  if (refExists(`origin/${name}`)) return `origin/${name}`;
  return null;
};

const listReleaseTags = () => {
  const r = git(['tag', '-l', '*-RELEASE', '--sort=-creatordate']);
  if (r.status !== 0) throw new Error(`git tag failed: ${r.stderr || r.stdout}`);
  return r.stdout
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 5);
};

const runNode = (script, args, env = {}) => {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: SITE_ROOT,
    env: { ...process.env, ...env },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.status !== 0) {
    throw new Error(
      `${path.basename(script)} failed: ${result.stderr || result.stdout}`,
    );
  }
  if (result.stderr) process.stderr.write(result.stderr);
};

const ensurePublicAssets = () => {
  const publicDir = path.join(SITE_ROOT, 'public');
  mkdirSync(publicDir, { recursive: true });
  if (existsSync(PUBLIC_LOGO)) {
    cpSync(PUBLIC_LOGO, path.join(publicDir, 'logo-small.png'));
  }
};

const buildVersion = ({ id, label, ref, workdir }) => {
  const docsDir = path.join(BUILD, id, 'docs');
  const outDir = path.join(DIST, id);
  const base = `/${id}/`;

  log(`\n=== building ${label} (${workdir ? 'worktree' : ref}) base=${base} ===`);
  rmSync(docsDir, { recursive: true, force: true });

  const prepareArgs = ['--out', docsDir, '--link-prefix', `/${id}`];
  if (workdir) prepareArgs.push('--workdir');
  else prepareArgs.push('--ref', ref);
  runNode(path.join(__dirname, 'prepare-docs.mjs'), prepareArgs);

  runNode(path.join(__dirname, 'build-manifest.mjs'), [], {
    DOCS_CONTENT_DIR: docsDir,
    DOCS_VERSION_ID: id,
    DOCS_VERSION_LABEL: label,
  });

  const result = spawnSync(
    'pnpm',
    ['exec', 'vite', 'build'],
    {
      cwd: SITE_ROOT,
      env: {
        ...process.env,
        DOCS_BASE: base,
        DOCS_OUT_DIR: outDir,
      },
      encoding: 'utf8',
      stdio: 'inherit',
    },
  );
  if (result.status !== 0) {
    throw new Error(`vite build failed for ${id}`);
  }

  // Raw markdown next to SPA routes: /{version}/user.md, /{version}/index.md, …
  runNode(path.join(__dirname, 'emit-raw-markdown.mjs'), [
    '--from',
    docsDir,
    '--to',
    outDir,
  ]);
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
    <title>OpenPeeps Docs</title>
    <script>location.replace('/${defaultId}/')</script>
  </head>
  <body>
    <p>Redirecting to <a href="/${defaultId}/">/${defaultId}/</a>…</p>
  </body>
</html>
`,
  );
};

const main = () => {
  ensurePublicAssets();
  rmSync(DIST, { recursive: true, force: true });
  mkdirSync(DIST, { recursive: true });
  mkdirSync(BUILD, { recursive: true });

  /** @type {{ id: string, label: string, ref: string, workdir?: boolean }[]} */
  const versions = [];

  if (localOnly) {
    versions.push({
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
      versions.push({ id: name, label: name, ref });
    }

    listReleaseTags().forEach((tag, index) => {
      versions.push({
        id: tag,
        label: index === 0 ? `${tag} (stable)` : tag,
        ref: tag,
      });
    });

    if (versions.length === 0) {
      throw new Error('No documentation versions to build');
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
