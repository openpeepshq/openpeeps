#!/usr/bin/env node

/**
 * esbuild patch gate (GHSA-67mh-4wv8-2f99).
 *
 * esbuild 0.18.20 reached the tree through drizzle-kit 0.31.11 ->
 * @esbuild-kit/esm-loader -> @esbuild-kit/core-utils (dev-only, both
 * deprecated in favor of tsx) and carries GHSA-67mh-4wv8-2f99, fixed in
 * esbuild >=0.25.0 (the 0.24.x line ends at 0.24.2, which is still
 * vulnerable). The pnpm-workspace.yaml override
 * `"@esbuild-kit/core-utils>esbuild": "0.25.12"` is the remediation.
 *
 * CI has no pnpm audit gate, so this pins the remediation against
 * regression:
 * 1. no esbuild below 0.25.0 is resolved anywhere in pnpm-lock.yaml
 * 2. the "@esbuild-kit/core-utils>esbuild" override is still present in
 *    pnpm-workspace.yaml — a dropped override line plus a consistently
 *    regenerated lockfile would otherwise reintroduce 0.18.x silently
 *
 * Usage: node scripts/check-esbuild-patch.mjs
 * Exits 1 if any esbuild <0.25.0 is resolved or the override is missing.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const MIN_PATCHED = '0.25.0';

const parseVersion = (v) => v.split('.').map((n) => parseInt(n, 10));

const belowFixed = (version) => {
  const [a, b, c] = parseVersion(version);
  const [ma, mb, mc] = parseVersion(MIN_PATCHED);
  return a < ma || (a === ma && b < mb) || (a === ma && b === mb && c < mc);
};

const checkLockfile = () => {
  const lock = readFileSync(join(ROOT, 'pnpm-lock.yaml'), 'utf-8');
  const versions = [
    ...new Set([...lock.matchAll(/esbuild@(\d+\.\d+\.\d+)/g)].map((m) => m[1])),
  ];
  const stale = versions.filter(belowFixed);
  if (stale.length) {
    console.error(
      `Check failed: vulnerable esbuild resolved in pnpm-lock.yaml: ` +
        `${stale.join(', ')} (fixed in >=${MIN_PATCHED}, ` +
        `see GHSA-67mh-4wv8-2f99).`,
    );
    return false;
  }
  console.log(
    `Check OK: pnpm-lock.yaml resolves esbuild ${
      versions.join(', ') || '(nothing)'
    } — all >=${MIN_PATCHED}.`,
  );
  return true;
};

const checkOverride = () => {
  const workspace = readFileSync(join(ROOT, 'pnpm-workspace.yaml'), 'utf-8');
  const m = workspace.match(
    /^\s*"?@esbuild-kit\/core-utils>esbuild"?:\s*"?(\d+\.\d+\.\d+)"?\s*$/m,
  );
  if (!m) {
    console.error(
      'Check failed: the "@esbuild-kit/core-utils>esbuild" override is ' +
        'missing from pnpm-workspace.yaml.',
    );
    return false;
  }
  if (belowFixed(m[1])) {
    console.error(
      `Check failed: the esbuild override targets ${m[1]}, below the ` +
        `patched >=${MIN_PATCHED}.`,
    );
    return false;
  }
  console.log(
    `Check OK: override "@esbuild-kit/core-utils>esbuild" present at ` +
      `${m[1]} (>=${MIN_PATCHED}).`,
  );
  return true;
};

const main = () => {
  const ok = checkLockfile() && checkOverride();
  process.exit(ok ? 0 : 1);
};

main();
