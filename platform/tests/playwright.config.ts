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
        command: 'node scripts/start-server.mjs',
        url: `${baseURL.replace(/\/$/, '')}/health`,
        reuseExistingServer: false,
        timeout: 180 * 1000,
        env: {
          DB_NAME: 'test',
          HOST: '127.0.0.1',
          PORT: '8080',
          FORCE_COLOR: '0',
          NO_COLOR: '1',
        },
      },
  globalSetup: './integration/global-setup.ts',
  testDir: 'integration',
  testMatch: /(.+\.)?(test|spec)\.[jt]s/,
  workers: 1,
  retries: 1,
  timeout: 120 * 1000,
  expect: {
    timeout: 15_000,
  },
};

export default config;
