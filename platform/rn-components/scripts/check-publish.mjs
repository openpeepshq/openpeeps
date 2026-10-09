#!/usr/bin/env node
/**
 * Publish gate: verify that the files npm will actually pack contain no
 * `~/` alias import specifiers. Consumers cannot resolve `~`, so any alias
 * that reaches the tarball breaks them (this is how 0.3.4 shipped broken).
 *
 * Uses `npm pack --dry-run --json` so the check respects the `files` field
 * exactly like the real publish. Exits non-zero with the offending files.
 *
 * Usage: node scripts/check-publish.mjs
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ALIAS_RE = /['"]~\//;
const SOURCE_RE = /\.(ts|tsx|js|jsx)$/;

const pack = spawnSync('npm', ['pack', '--dry-run', '--json'], {
  cwd: root,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
});
if (pack.error || pack.status !== 0) {
  console.error('npm pack --dry-run failed:');
  console.error(pack.stderr || pack.error?.message);
  process.exit(1);
}

const [manifest] = JSON.parse(pack.stdout);
const files = manifest.files.filter((file) => SOURCE_RE.test(file.path));

const offenders = [];
for (const { path: filePath } of files) {
  const contents = fs.readFileSync(path.join(root, filePath), 'utf8');
  const lines = contents.split('\n');
  lines.forEach((line, i) => {
    if (ALIAS_RE.test(line)) {
      offenders.push(`${filePath}:${i + 1}: ${line.trim()}`);
    }
  });
}

if (offenders.length > 0) {
  console.error(`Alias imports found in ${files.length} packed source files:`);
  for (const line of offenders) {
    console.error(`  ${line}`);
  }
  process.exit(1);
}

console.log(
  `Publish check passed: no ~/ alias imports in ${files.length} packed source files`
);
