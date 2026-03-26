import type { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  use: {
    headless: true,
    baseURL: 'http://web:8080',
  },
  testDir: 'tests',
  testMatch: /(.+\.)?(test|spec)\.[jt]s/,
  timeout: 600 * 1000,
  expect: {
    timeout: 60000,
  },
};

export default config;
