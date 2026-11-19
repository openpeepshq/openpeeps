import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./vitest.setup.ts'],
    // DB-backed suites touch Postgres for the first time inside empty() ->
    // initPostgres: on a cold per-worker database (fresh CI runner) that
    // first touch runs the whole migration set. Under runner contention it
    // can exceed the defaults (test 5s / hook 10s), and the retried test's
    // truncate then interleaves with the orphaned seed into duplicate-key
    // failures. Generous timeouts keep that one-time cold-start cost inside
    // the first run instead of failing the suite.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
