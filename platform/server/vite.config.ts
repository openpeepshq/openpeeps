import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '#lib': resolve(__dirname, 'src/lib'),
      '#types': resolve(__dirname, 'src/types.ts'),
    },
  },
  build: {
    target: 'node22',
    ssr: 'src/server.ts',
    rollupOptions: {
      output: {
        format: 'es',
        entryFileNames: '[name].js',
      },
      // Externalise every dependency — `@openpeeps/*` and everything in
      // node_modules. Vite's default SSR externaliser tries to inline some
      // packages which then fails on pre-compiled workspace packages with
      // stale `dist/` outputs. Explicitly externalising everything makes the
      // build a thin entrypoint that node resolves at runtime, matching how
      // `vite-node` already runs the server in dev.
      external: (id) =>
        !id.startsWith('.') &&
        !id.startsWith('/') &&
        !id.startsWith('#'),
    },
  },
  ssr: {
    target: 'node',
    noExternal: [],
  },
});
