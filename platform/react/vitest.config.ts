import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // The webNavigator parity test (src/test/webNavHrefOf.parity.test.ts) imports
  // the real `createWebNavigator` from `platform/web/src/navigation/webNavigator.ts`.
  // That file imports `@openpeepshq/react` — a package `platform/react` does not
  // depend on (web is the host, not a peer). The navigation source is the light
  // entry providing exactly the symbols webNavigator consumes (encodeNavRedirect,
  // hrefOfWelcome, Navigator, NavTarget), so this exact-match alias lets that
  // import resolve to react source in the test runner, mirroring the dev alias
  // in platform/web/vite.config.ts. Nothing else in platform/react imports the
  // bare `@openpeepshq/react` specifier, so this is inert for every other test.
  resolve: {
    alias: [
      {
        find: /^@openpeepshq\/react$/,
        replacement: fileURLToPath(
          new URL('./src/navigation/index.ts', import.meta.url),
        ),
      },
    ],
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],
  },
});
