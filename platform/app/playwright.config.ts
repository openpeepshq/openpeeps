import type { PlaywrightTestConfig } from '@playwright/test';

declare const process: { env: Record<string, string | undefined> };

const isCI = !!process.env.CI;
const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ??
  (isCI ? 'http://web:8080' : 'http://127.0.0.1:8080');

const config: PlaywrightTestConfig = {
  use: {
    headless: true,
    baseURL,
  },
  webServer: isCI
    ? undefined
    : {
        // Start a local app server so integration tests run outside Docker too.
        command:
          'DB_NAME=test pnpm dev --host 127.0.0.1 --port 8080 --strictPort',
        url: baseURL,
        reuseExistingServer: false,
        timeout: 120 * 1000,
        // pnpm/playwright force-enable color, which makes the captured
        // [WebServer] logs unreadable. Disable colour explicitly.
        env: {
          FORCE_COLOR: '0',
          NO_COLOR: '1',
        },
      },
  globalSetup: './tests/global-setup.ts',
  testDir: 'tests',
  testMatch: /(.+\.)?(test|spec)\.[jt]s/,
  workers: 1,
  retries: 1,
  timeout: 120 * 1000,
  expect: {
    timeout: 15_000,
  },
};

export default config;
