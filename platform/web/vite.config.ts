import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { openpeepsPwaPluginConfig } from '@openpeeps/react/pwa/vite';

const apiTarget = process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:5173';

export default defineConfig({
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
