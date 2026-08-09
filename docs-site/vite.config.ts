import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const base = process.env.DOCS_BASE || '/';

export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: process.env.DOCS_OUT_DIR || 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5175,
  },
});
