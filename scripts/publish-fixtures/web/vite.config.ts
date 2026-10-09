import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const dir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(dir, '../../..');

export default defineConfig({
  root: dir,
  logLevel: 'error',
  resolve: {
    alias: {
      '@openpeepshq/common/zod': resolve(
        repoRoot,
        'platform/common/src/zod.ts',
      ),
      '@openpeepshq/common': resolve(repoRoot, 'platform/common/src/index.ts'),
    },
  },
  build: {
    emptyOutDir: true,
    outDir: resolve(dir, 'dist'),
    lib: {
      entry: resolve(dir, 'entry.ts'),
      formats: ['es'],
      fileName: () => 'smoke.js',
    },
  },
});
