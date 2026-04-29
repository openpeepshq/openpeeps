import type { PlaywrightTestConfig } from '@playwright/test';

declare const process: { env: Record<string, string | undefined> };

const isCI = !!process.env.CI;
const baseURL = isCI ? 'http://web:8080' : 'http://127.0.0.1:8080';

const config: PlaywrightTestConfig = {
  use: {
    headless: true,
    baseURL,
  },
  webServer: isCI
    ? undefined
    : {
      command:
        'DB_NAME=test pnpm dev --host 127.0.0.1 --port 8080 --strictPort',
      url: baseURL,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  testDir: 'tests',
  testMatch: /(.+\.)?(test|spec)\.[jt]s/,
  timeout: 15_000,
  expect: {
    timeout: 15_000,
  },
};

export default config;
