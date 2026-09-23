import { defineConfig } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173';

const videoY4m = process.env.RECORDING_TEST_VIDEO_Y4M ?? '/tmp/fireplace.y4m';

export default defineConfig({
  testDir: '.',
  testMatch: /recording\.test\.ts$/,
  use: {
    baseURL,
    headless: true,
    browserName: 'chromium',
    // Fake video capture so participants publish real video tracks.
    launchOptions: {
      args: [
        '--use-fake-device-for-media-stream',
        `--use-file-for-fake-video-capture=${videoY4m}`,
        '--use-fake-ui-for-media-stream',
        '--autoplay-policy=no-user-gesture-required',
      ],
    },
  },
  timeout: 180 * 60 * 1000, // 3 hours — accommodates long recording cycles
  expect: {
    timeout: 30_000,
  },
  workers: 1,
});
