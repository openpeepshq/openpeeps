#!/usr/bin/env node
/**
 * Delegates to the repo-root publish gate (scripts/check-publish-gate.mjs).
 *
 * Usage: node scripts/check-publish.mjs
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../..',
);
const result = spawnSync(
  'node',
  [
    path.join(repoRoot, 'scripts/check-publish-gate.mjs'),
    '--package',
    'rn-components',
    '--skip-smoke',
  ],
  { cwd: repoRoot, stdio: 'inherit' },
);
process.exit(result.status ?? 1);
