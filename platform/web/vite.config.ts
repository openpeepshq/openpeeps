import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { openpeepsPwaPluginConfig } from '@openpeepshq/react/pwa-vite';
import { openpeepsDocsPlugin } from './vite-plugin-docs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Use workspace TypeScript sources in dev so `pnpm dev` picks up @openpeepshq/react changes without a separate library build. */
const openpeepsReactSrc = path.resolve(__dirname, '../react/src');

const apiTarget = process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:5173';

export default defineConfig({
  resolve: {
    alias: [
      // Longer match first (subpath before package root).
      {
        find: '@openpeepshq/react/pwa-vite',
        replacement: path.join(openpeepsReactSrc, 'pwa/vite.ts'),
      },
      {
        find: '@openpeepshq/react/components',
        replacement: path.join(openpeepsReactSrc, 'components/index.ts'),
      },
      {
        find: '@openpeepshq/react',
        replacement: path.join(openpeepsReactSrc, 'index.ts'),
      },
    ],
  },
  plugins: [
    react(),
    openpeepsDocsPlugin(path.resolve(__dirname, 'docs')),
    // `index.html` is a Mustache template rendered by the API server in
    // production. Fill placeholders only during `vite serve` so local UI
    // work doesn't flash `{{name}}` in the tab title.
    {
      name: 'spa-mustache-dev-defaults',
      transformIndexHtml: {
        order: 'pre',
        handler(html, ctx) {
          if (!ctx.server) return html;
          return html
            .replaceAll('{{name}}', 'OpenPeeps')
            .replaceAll('{{description}}', 'OpenPeeps community')
            .replaceAll('{{themeColor}}', '#0f172a')
            .replaceAll('{{pageUrl}}', '/')
            .replaceAll('{{path}}', '/')
            .replace(/\{\{#imageUrl\}\}[\s\S]*?\{\{\/imageUrl\}\}/g, '');
        },
      },
    },
    // `openpeepsPwaPluginConfig` returns the right `VitePWA(...)` options to
    // wire in the shared `@openpeepshq/react/service-worker.ts`.
    VitePWA(
      openpeepsPwaPluginConfig({
        appName: 'OpenPeeps',
        shortName: 'OpenPeeps',
        description: 'OpenPeeps community',
        generateManifest: false,
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
      // LiveKit egress uploads jam recordings to `/s3`; the observer page it
      // records loads stored media from `/storage`; HLS VOD playback fetches
      // playlists/segments from `/media/streaming`. Forward these to the API
      // server so they work in dev (and when exposed publicly via a tunnel).
      '/s3': {
        target: apiTarget,
        changeOrigin: true,
      },
      '/storage': {
        target: apiTarget,
        changeOrigin: true,
      },
      '/media/streaming': {
        target: apiTarget,
        changeOrigin: true,
      },
      '/backups': {
        target: apiTarget,
        changeOrigin: true,
      },
      '/pwa': {
        target: apiTarget,
        changeOrigin: true,
      },
      '/favicon.ico': {
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
