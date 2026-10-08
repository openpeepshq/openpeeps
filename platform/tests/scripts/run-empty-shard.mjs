import { readdirSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const testsRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const suiteDir = path.join(testsRoot, 'suites/empty');
const testFilePattern = /(.+\.)?(test|spec|setup)\.[jt]s$/;

// Each entry is one community. `ui/test.ts` is on every shard and drops
// all but its round-robin slice. The other files are whole, placed so the
// browser-heavy files are not piled onto the same shard.
const shardGroups = [
  ['api/openpeeps/core/v1/auth/test.ts', 'forms/test.ts', 'ui/test.ts'],
  [
    'api/openpeeps/core/v1/plugins/test.ts',
    'api/test.ts',
    'auth/register/test.ts',
    'moderation/test.ts',
    'ui/event-creation.test.ts',
    'ui/group-visibility.test.ts',
    'ui/test.ts',
  ],
  ['email-push/session-sse.test.ts', 'email-push/test.ts', 'ui/test.ts'],
  ['api/gaps/test.ts', 'ui/test.ts', 'user-actions/test.ts'],
];

const walkTests = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkTests(fullPath);
    if (!testFilePattern.test(entry.name)) return [];
    return [path.relative(suiteDir, fullPath)];
  });

const assertCoverage = () => {
  const onDisk = walkTests(suiteDir).filter((file) => file !== 'seed.setup.ts');
  const missing = onDisk.filter(
    (file) => !shardGroups.some((group) => group.includes(file)),
  );
  const duplicated = onDisk.filter((file) => {
    if (file === 'ui/test.ts') return false;
    return shardGroups.filter((group) => group.includes(file)).length > 1;
  });
  const uiOnEveryShard = shardGroups.every((group) =>
    group.includes('ui/test.ts'),
  );
  if (missing.length || duplicated.length || !uiOnEveryShard) {
    console.error(
      [
        'Empty-suite shard groups are out of date.',
        missing.length ? `Missing: ${missing.join(', ')}` : '',
        duplicated.length
          ? `Not on exactly one shard: ${duplicated.join(', ')}`
          : '',
        uiOnEveryShard ? '' : 'ui/test.ts must be listed on every shard.',
      ]
        .filter(Boolean)
        .join('\n'),
    );
    process.exit(1);
  }
};

const readShard = () => {
  const spec = process.env.PLAYWRIGHT_SHARD ?? '';
  const match = /^([1-9]\d*)\/([1-9]\d*)$/.exec(spec);
  if (!match) {
    console.error(
      `PLAYWRIGHT_SHARD must look like 1/${shardGroups.length}, got "${spec}"`,
    );
    process.exit(1);
  }
  const current = Number(match[1]);
  const total = Number(match[2]);
  if (total !== shardGroups.length || current > total) {
    console.error(
      `PLAYWRIGHT_SHARD ${spec} does not match ${shardGroups.length} groups`,
    );
    process.exit(1);
  }
  return current - 1;
};

assertCoverage();
const group = shardGroups[readShard()];
const env = { ...process.env, INTEGRATION_SUITE: 'empty' };
delete env.FORCE_COLOR;

const result = spawnSync(
  'pnpm',
  [
    'exec',
    'playwright',
    'test',
    '--project=empty',
    ...group.map((file) => path.join('suites/empty', file)),
  ],
  { cwd: testsRoot, stdio: 'inherit', env },
);

process.exit(result.status ?? 1);
