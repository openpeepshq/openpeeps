import type { PlaywrightTestConfig, Project } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

declare const process: { env: Record<string, string | undefined> };

const isCI = !!process.env.CI;
const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ??
  (isCI ? 'http://web:8080' : 'http://127.0.0.1:8080');

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const suite = process.env.INTEGRATION_SUITE;

const livekitConfigured = () => {
  const key = process.env.JAMS_LIVEKIT_API_KEY ?? '';
  const secret = process.env.JAMS_LIVEKIT_API_SECRET ?? '';
  const url = process.env.JAMS_LIVEKIT_URL ?? '';
  if (!key || !secret || !url) return false;
  if (key.startsWith('APIxxxx') || secret.startsWith('xxxxx')) return false;
  return true;
};

type SuiteDef = { name: string; dir: string };

const allSuites: SuiteDef[] = [
  { name: 'empty', dir: 'suites/empty' },
  { name: 'default', dir: 'suites/default' },
  { name: 'public', dir: 'suites/public' },
  { name: 'sso', dir: 'suites/sso' },
  { name: 'jams', dir: 'suites/jams' },
];

const selectedSuites = suite
  ? allSuites.filter((entry) => entry.name === suite)
  : allSuites.filter(
      (entry) => entry.name !== 'jams' || livekitConfigured(),
    );

/** Playwright ignores per-project globalSetup; use setup projects instead. */
const projects: Project[] = selectedSuites.flatMap((entry) => {
  const testDir = path.join(rootDir, entry.dir);
  const setupName = `${entry.name}-setup`;
  return [
    {
      name: setupName,
      testDir,
      testMatch: /seed\.setup\.ts/,
    },
    {
      name: entry.name,
      testDir,
      testIgnore: /seed\.setup\.ts/,
      dependencies: [setupName],
    },
  ];
});

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
        reuseExistingServer: true,
        timeout: 180 * 1000,
        env: {
          AUTO_MIGRATE_FROM_ARANGO: 'false',
          DATABASE_URL:
            process.env.DATABASE_URL ??
            'postgresql://openpeeps:openpeeps@127.0.0.1:5432/openpeeps',
          HOST: '127.0.0.1',
          PORT: '8080',
          EMAIL_CONFIG_HOST: process.env.EMAIL_CONFIG_HOST ?? '127.0.0.1',
          EMAIL_CONFIG_PORT: process.env.EMAIL_CONFIG_PORT ?? '1025',
          EMAIL_CONFIG_SECURE: 'false',
          EMAIL_DEFAULT_FROM:
            process.env.EMAIL_DEFAULT_FROM ?? 'test@openpeeps.test',
          FORCE_COLOR: '0',
          NO_COLOR: '1',
        },
      },
  projects,
  testMatch: /(.+\.)?(test|spec|setup)\.[jt]s/,
  workers: 1,
  retries: isCI ? 1 : 0,
  timeout: 120 * 1000,
  expect: {
    timeout: 15_000,
  },
};

export default config;
