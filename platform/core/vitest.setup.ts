import pg from 'pg';

// Every vitest worker gets its own throwaway database so DB-backed tests
// (migrate-on-boot, empty(), seed()) never race a sibling worker on the
// shared `openpeeps` database — with several workers those interleave into
// duplicate-key and lost-seed failures.
//
// DATABASE_URL is read by pgConnectionString() at call time, so overriding
// the environment here is picked up by every lazy connection. The database
// is created on demand (the postgres service user is a superuser) and left
// behind on purpose: the next run's empty() truncation resets it.
const DEFAULT_URL = 'postgresql://openpeeps:openpeeps@localhost:5432/openpeeps';

const template = process.env.DATABASE_URL ?? DEFAULT_URL;
const poolId = Number(process.env.VITEST_POOL_ID ?? '0');
const workerIndex = Number.isFinite(poolId) ? poolId : 0;
const workerUrl = new URL(template);
workerUrl.pathname = `${workerUrl.pathname.replace(/\/$/, '')}_w${workerIndex}`;
const workerDatabase = workerUrl.pathname.replace(/^\/+/, '');

const client = new pg.Client({ connectionString: template });
try {
  await client.connect();
  await client.query(`CREATE DATABASE "${workerDatabase}"`);
} catch (err) {
  // 42P04 duplicate_database: a sibling run (or an earlier run) already
  // created this worker database — reuse it. Anything else is logged and
  // non-fatal: tests without reachable Postgres skip themselves.
  if ((err as { code?: string }).code !== '42P04') {
    console.error(
      `[vitest.setup] worker database ${workerDatabase} not created:`,
      (err as Error).message,
    );
  }
} finally {
  await client.end().catch(() => {});
}

process.env.DATABASE_URL = workerUrl.toString();
