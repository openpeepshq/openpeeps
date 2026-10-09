#!/usr/bin/env node
/**
 * Publish gate for @openpeepshq/* libraries (SHIPPING_LIBRARIES.md).
 *
 * Metro consumes TypeScript source (`react-native.default`). tsc uses nested
 * `react-native.types` / top-level `types` → dist so RN DOM libs and
 * `verbatimModuleSyntax` do not re-check workspace source. Node uses `dist/`.
 *
 * 1. tsc --noEmit
 * 2. no ~/ or @/ alias specifiers in packed source
 * 3. no `export * as` in packed source
 * 4. no sibling `./index` imports (self-directory barrels)
 * 5. web smoke (vite lib build of scripts/publish-fixtures/web)
 * 6. RN smoke (Metro release bundle of scripts/publish-fixtures/rn)
 * 7. exactly one zod version in the workspace lockfile
 *
 * Usage:
 *   node scripts/check-publish-gate.mjs
 *   node scripts/check-publish-gate.mjs --package common
 *   node scripts/check-publish-gate.mjs --skip-smoke
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const PACKAGES = {
  common: 'platform/common',
  client: 'platform/client',
  react: 'platform/react',
  'rn-components': 'platform/rn-components',
  'fetch-client': 'libraries/fetch-client',
  greenscreen: 'libraries/greenscreen',
  'react-ui': 'libraries/react-ui',
};

const FILTER = {
  common: '@openpeepshq/common',
  client: '@openpeepshq/client',
  react: '@openpeepshq/react',
  'rn-components': '@openpeepshq/rn-components',
  'fetch-client': '@openpeepshq/fetch-client',
  greenscreen: '@openpeepshq/greenscreen',
  'react-ui': '@openpeepshq/react-ui',
};

const ALIAS_RE = /['"](?:~\/|@\/)/;
const EXPORT_NS_RE = /export\s+\*\s+as\s/;
const SELF_INDEX_RE = /from\s+['"]\.\/index['"]/;
const SOURCE_RE = /\.(ts|tsx|js|jsx)$/;
const DIST_BUILD = [
  'common',
  'fetch-client',
  'client',
  'greenscreen',
  'react-ui',
  'react',
];

const args = process.argv.slice(2);
const skipSmoke = args.includes('--skip-smoke');
const packageArg = (() => {
  const i = args.indexOf('--package');
  return i >= 0 ? args[i + 1] : null;
})();

const selected = packageArg
  ? { [packageArg]: PACKAGES[packageArg] }
  : PACKAGES;

if (packageArg && !PACKAGES[packageArg]) {
  console.error(`Unknown package "${packageArg}".`);
  process.exit(1);
}

const run = (command, commandArgs, cwd = repoRoot) => {
  const result = spawnSync(command, commandArgs, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return result;
};

let failed = false;
const fail = (message) => {
  console.error(message);
  failed = true;
};

if (!packageArg) {
  for (const name of DIST_BUILD) {
    console.log(`[${name}] build`);
    const built = run('pnpm', ['--filter', FILTER[name], 'build']);
    if (built.status !== 0) {
      fail(`[${name}] build failed:\n${built.stdout}${built.stderr}`);
    }
  }
}

for (const [name, rel] of Object.entries(selected)) {
  const pkgDir = path.join(repoRoot, rel);
  console.log(`\n[${name}] typecheck`);
  const tsc = run('pnpm', ['--filter', FILTER[name], 'typecheck']);
  if (tsc.status !== 0) {
    fail(`[${name}] tsc --noEmit failed:\n${tsc.stdout}${tsc.stderr}`);
    continue;
  }

  console.log(`[${name}] packed source`);
  const pack = run('npm', ['pack', '--dry-run', '--json'], pkgDir);
  if (pack.error || pack.status !== 0) {
    fail(`[${name}] npm pack --dry-run failed:\n${pack.stderr || pack.error?.message}`);
    continue;
  }
  const [manifest] = JSON.parse(pack.stdout);
  const files = manifest.files.filter((file) => SOURCE_RE.test(file.path));
  const aliases = [];
  const namespaces = [];
  const selfIndex = [];
  for (const { path: filePath } of files) {
    const contents = fs.readFileSync(path.join(pkgDir, filePath), 'utf8');
    const dir = path.dirname(filePath);
    const isIndex = /^index\./.test(path.basename(filePath));
    const hasOwnIndex = ['index.ts', 'index.tsx', 'index.js'].some((base) =>
      fs.existsSync(path.join(pkgDir, dir, base)),
    );
    contents.split('\n').forEach((line, i) => {
      const loc = `${filePath}:${i + 1}`;
      if (ALIAS_RE.test(line)) aliases.push(`${loc}: ${line.trim()}`);
      if (EXPORT_NS_RE.test(line)) namespaces.push(`${loc}: ${line.trim()}`);
      if (!isIndex && hasOwnIndex && SELF_INDEX_RE.test(line)) {
        selfIndex.push(`${loc}: ${line.trim()}`);
      }
    });
  }
  if (aliases.length) {
    fail(`[${name}] alias imports in packed source:\n  ${aliases.join('\n  ')}`);
  }
  if (namespaces.length) {
    fail(`[${name}] export * as in packed source:\n  ${namespaces.join('\n  ')}`);
  }
  if (selfIndex.length) {
    fail(
      `[${name}] sibling ./index imports (circular barrel):\n  ${selfIndex.join('\n  ')}`,
    );
  }
  if (!aliases.length && !namespaces.length && !selfIndex.length) {
    console.log(`[${name}] packed source ok (${files.length} files)`);
  }
}

if (!packageArg) {
  console.log('\n[zod] single version');
  const why = run('pnpm', ['why', 'zod']);
  const versions = new Set(
    [...(why.stdout || '').matchAll(/zod@(\d+\.\d+\.\d+)/g)].map((m) => m[1]),
  );
  if (versions.size !== 1) {
    fail(
      `[zod] expected exactly one version, found ${[...versions].join(', ') || 'none'}\n${why.stdout}`,
    );
  } else {
    console.log(`[zod] ${[...versions][0]}`);
  }
}

if (!skipSmoke && !packageArg) {
  const fixtureDir = path.join(repoRoot, 'scripts/publish-fixtures/web');
  const outDir = path.join(fixtureDir, 'dist');
  console.log('\n[web] smoke build');
  const vite = run(
    'pnpm',
    [
      '--filter',
      '@openpeepshq/react-ui',
      'exec',
      'vite',
      'build',
      '--config',
      path.join(fixtureDir, 'vite.config.ts'),
    ],
    repoRoot,
  );
  if (vite.status !== 0) {
    fail(`[web] vite smoke failed:\n${vite.stdout}${vite.stderr}`);
  } else if (!fs.existsSync(path.join(outDir, 'smoke.js'))) {
    fail('[web] vite smoke did not write dist/smoke.js');
  } else {
    console.log('[web] smoke ok');
  }

  const rnDir = path.join(repoRoot, 'scripts/publish-fixtures/rn');
  const rnOut = path.join(rnDir, 'dist/smoke.js');
  fs.mkdirSync(path.join(rnDir, 'dist'), { recursive: true });
  console.log('\n[rn] smoke bundle');
  const metro = run(
    'pnpm',
    [
      '--filter',
      '@openpeepshq/rn-components',
      'exec',
      'react-native',
      'bundle',
      '--config',
      path.join(rnDir, 'metro.config.cjs'),
      '--entry-file',
      path.join(rnDir, 'entry.ts'),
      '--platform',
      'ios',
      '--dev',
      'false',
      '--bundle-output',
      rnOut,
      '--reset-cache',
    ],
    repoRoot,
  );
  if (metro.status !== 0) {
    fail(`[rn] metro smoke failed:\n${metro.stdout}${metro.stderr}`);
  } else if (!fs.existsSync(rnOut)) {
    fail('[rn] metro smoke did not write dist/smoke.js');
  } else {
    console.log('[rn] smoke ok');
  }
}

if (failed) {
  console.error('\nPublish gate failed.');
  process.exit(1);
}
console.log('\nPublish gate passed.');
