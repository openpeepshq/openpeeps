import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: [
      'node_modules',
      'dist',
      '.idea',
      '.git',
      '.cache',
      // Standalone assert script (not a Vitest suite); run via vite-node.
      'src/lib/spaHtml.test.ts',
    ],
  },
  resolve: {
    alias: {
      '#lib': resolve(__dirname, 'src/lib'),
      '#types': resolve(__dirname, 'src/types.ts'),
    },
  },
});
