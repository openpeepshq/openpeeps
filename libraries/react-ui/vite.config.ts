import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    dts({
      include: ['src'],
      exclude: ['**/*.test.ts', '**/*.test.tsx'],
      tsconfigPath: './tsconfig.json',
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  experimental: {
    renderBuiltUrl(filename, { hostType }) {
      if (hostType === 'css') {
        return { relative: true };
      }
    },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    cssCodeSplit: false,
    assetsInlineLimit: 0,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: () => 'index.js',
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        '@tanstack/react-query',
        /^@radix-ui\//,
      ],
      output: {
        preserveModules: false,
        assetFileNames: (asset) => {
          if (asset.name && asset.name.endsWith('.css')) return 'style.css';
          if (asset.name && /\.(woff2?|ttf)$/i.test(asset.name)) {
            return 'fonts/[name][extname]';
          }
          return asset.name ?? 'asset-[name][extname]';
        },
      },
    },
  },
});
