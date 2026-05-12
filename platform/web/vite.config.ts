import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { openpeepsPwaPluginConfig } from '@openpeeps/react/pwa/vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Use workspace TypeScript sources in dev so `pnpm dev` picks up @openpeeps/react changes without a separate library build. */
const openpeepsReactSrc = path.resolve(__dirname, '../react/src');

const apiTarget = process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:5173';

export default defineConfig({
  resolve: {
    alias: [
      // Longer match first (subpath before package root).
      {
        find: '@openpeeps/react/components',
        replacement: path.join(openpeepsReactSrc, 'components/index.ts'),
      },
      {
        find: '@openpeeps/react',
        replacement: path.join(openpeepsReactSrc, 'index.ts'),
      },
    ],
  },
  plugins: [
    react(),
    // `openpeepsPwaPluginConfig` returns the right `VitePWA(...)` options to
    // wire in the shared `@openpeeps/react/service-worker.ts`.
    VitePWA(
      openpeepsPwaPluginConfig({
        appName: 'OpenPeeps',
        shortName: 'OpenPeeps',
        description: 'OpenPeeps community',
        devOptions: { enabled: false },
      }) as Parameters<typeof VitePWA>[0],
    ),
  ],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    outDir: 'dist',
    emptyOutDir: true,
  },
});
