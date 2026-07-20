import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../..',
);

config({ path: path.join(repoRoot, '.env') });
config({ path: path.join(repoRoot, 'platform/server/.env') });

const fixtureArg = process.argv[2];
if (!fixtureArg) {
  console.error('Usage: node restore-fixture.mjs <relative-or-absolute-zip>');
  process.exit(1);
}

const fixturePath = path.isAbsolute(fixtureArg)
  ? fixtureArg
  : path.join(path.dirname(fileURLToPath(import.meta.url)), '..', fixtureArg);

process.env.AUTO_MIGRATE_FROM_ARANGO = 'false';
process.env.MEDIA_STORAGE_PARAMS_PATH =
  process.env.MEDIA_STORAGE_PARAMS_PATH || path.join(repoRoot, '.media-test');
process.env.LOGS_LOCAL_PATH =
  process.env.LOGS_LOCAL_PATH || path.join(repoRoot, '.logs-test');

const { restoreBackups } = await import('@openpeeps/core/backups');
await restoreBackups(fixturePath);
console.log(`Restored fixture ${fixturePath}`);
