import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const gallerySrc = path.resolve(__dirname, 'src');
const reactUiSrc = path.resolve(__dirname, '../../libraries/react-ui/src');
const reactSrc = path.resolve(__dirname, '../../platform/react/src');

const base = process.env.GALLERY_BASE || '/';

const resolveExisting = (candidates: string[]): string | null => {
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
};

const resolveAtPath = (root: string, subpath: string) =>
  resolveExisting([
    path.join(root, `${subpath}.ts`),
    path.join(root, `${subpath}.tsx`),
    path.join(root, subpath, 'index.ts'),
    path.join(root, subpath, 'index.tsx'),
    path.join(root, subpath),
  ]);

const isReactUiImporter = (importer?: string) =>
  !!importer &&
  (importer.includes(`${path.sep}libraries${path.sep}react-ui${path.sep}`) ||
    importer.includes('/libraries/react-ui/'));

/**
 * Dev-only: resolve workspace packages (and react-ui `@/` imports) from
 * TypeScript sources so gallery HMR picks up local component edits.
 */
const workspaceSourcePlugin = (): Plugin => ({
  name: 'gallery-workspace-source',
  enforce: 'pre',
  resolveId(id, importer) {
    if (id === '@openpeepshq/react-ui/styles.css') {
      return path.join(reactUiSrc, 'styles/globals.css');
    }
    if (id === '@openpeepshq/react-ui') {
      return path.join(reactUiSrc, 'index.ts');
    }
    if (id.startsWith('@openpeepshq/react/')) {
      const subpath = id.slice('@openpeepshq/react/'.length);
      return resolveAtPath(reactSrc, subpath);
    }
    if (id.startsWith('@/')) {
      const subpath = id.slice(2);
      if (isReactUiImporter(importer)) {
        return resolveAtPath(reactUiSrc, subpath);
      }
      // Gallery app imports (`@/components/...`).
      if (
        !importer ||
        importer.includes(
          `${path.sep}examples${path.sep}component-gallery${path.sep}`,
        ) ||
        importer.includes('/examples/component-gallery/')
      ) {
        return resolveAtPath(gallerySrc, subpath);
      }
    }
    return null;
  },
});

export default defineConfig(({ command }) => ({
  base,
  plugins: [...(command === 'serve' ? [workspaceSourcePlugin()] : []), react()],
  resolve: {
    alias:
      command === 'serve'
        ? []
        : [{ find: /^@\//, replacement: `${gallerySrc}/` }],
  },
  define: {
    __GALLERY_VERSION_ID__: JSON.stringify(
      process.env.GALLERY_VERSION_ID || 'main',
    ),
    __GALLERY_VERSION_LABEL__: JSON.stringify(
      process.env.GALLERY_VERSION_LABEL || 'main',
    ),
  },
  build: {
    outDir: process.env.GALLERY_OUT_DIR || 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5176,
  },
}));
