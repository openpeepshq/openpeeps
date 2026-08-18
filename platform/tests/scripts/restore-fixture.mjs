import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

const testsRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const repoRoot = path.resolve(testsRoot, '../..');

config({ path: path.join(repoRoot, '.env') });
config({ path: path.join(repoRoot, 'platform/server/.env') });

const fixtureArg = process.argv[2];
if (!fixtureArg) {
  console.error('Usage: node restore-fixture.mjs <relative-or-absolute-zip>');
  process.exit(1);
}

// Callers pass either tests-root-relative (`fixtures/backups/x.zip`, compose +
// build workflow) or repo-root-relative (`platform/tests/fixtures/...`, perf
// workflow and README) paths, so try both instead of guessing one.
const candidates = path.isAbsolute(fixtureArg)
  ? [fixtureArg]
  : [path.join(testsRoot, fixtureArg), path.join(repoRoot, fixtureArg)];

const fixturePath = candidates.find((candidate) => existsSync(candidate));
if (!fixturePath) {
  console.error(
    `Fixture not found: ${fixtureArg}\nLooked in:\n${candidates
      .map((candidate) => `  ${candidate}`)
      .join('\n')}`,
  );
  process.exit(1);
}

process.env.AUTO_MIGRATE_FROM_ARANGO = 'false';
process.env.MEDIA_STORAGE_PARAMS_PATH =
  process.env.MEDIA_STORAGE_PARAMS_PATH || path.join(repoRoot, '.media-test');
process.env.LOGS_LOCAL_PATH =
  process.env.LOGS_LOCAL_PATH || path.join(repoRoot, '.logs-test');

const { restoreBackups } = await import('@openpeepshq/core/backups');
await restoreBackups(fixturePath);
console.log(`Restored fixture ${fixturePath}`);
