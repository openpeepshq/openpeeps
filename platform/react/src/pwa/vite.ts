/**
 * Helper that returns a `VitePWAOptions` object pre-wired for the OpenPeeps
 * service worker. Apps install `vite-plugin-pwa` themselves and import this
 * helper to plug in the shared SW + a default web app manifest.
 *
 * This module never imports `vite-plugin-pwa` at runtime so it stays optional
 * for apps that ship their own SW pipeline.
 */

export interface OpenpeepsPwaPluginOptions {
  /** Application name (`name` in the manifest). */
  appName: string;
  /** Short application name. Defaults to `appName`. */
  shortName?: string;
  /** App description. */
  description?: string;
  /** Theme color for the manifest. */
  themeColor?: string;
  /** Background color for the manifest. */
  backgroundColor?: string;
  /** Override scope/start URL (defaults to `/`). */
  scope?: string;
  startUrl?: string;
  /** Path to ship the SW under. Defaults to `sw.js`. */
  filename?: string;
  /** Enable in dev mode. */
  devOptions?: { enabled?: boolean };
  /** Add or override icons. */
  icons?: Array<{
    src: string;
    sizes: string;
    type?: string;
    purpose?: string;
  }>;
  /** Replace the default manifest entirely. */
  manifest?: Record<string, unknown>;
  /** When false, skip emitting a static web manifest (use `/pwa/manifest.json`). */
  generateManifest?: boolean;
  /** Replace the default workbox `injectManifest` config. */
  injectManifest?: Record<string, unknown>;
}

const defaultIcons = [
  { src: '/pwa/icon-192.png', sizes: '192x192', type: 'image/png' },
  { src: '/pwa/icon-512.png', sizes: '512x512', type: 'image/png' },
  {
    src: '/pwa/icon-maskable.png',
    sizes: '512x512',
    type: 'image/png',
    purpose: 'maskable',
  },
];

/**
 * Returns a config object compatible with `VitePWA({ ... })`.
 *
 * Pass it to `VitePWA(openpeepsPwaPluginConfig({...}))` from
 * `vite-plugin-pwa`. Uses `injectManifest` so the OpenPeeps SW can be the
 * source of truth for push / deep-link / invalidation logic.
 */
export const openpeepsPwaPluginConfig = (
  options: OpenpeepsPwaPluginOptions,
): Record<string, unknown> => {
  const {
    appName,
    shortName = appName,
    description = appName,
    themeColor = '#0f172a',
    backgroundColor = '#ffffff',
    scope = '/',
    startUrl = '/',
    filename = 'sw.js',
    devOptions,
    icons = defaultIcons,
    manifest,
    generateManifest = true,
    injectManifest,
  } = options;

  const resolvedManifest =
    generateManifest === false
      ? false
      : (manifest ?? {
          name: appName,
          short_name: shortName,
          description,
          theme_color: themeColor,
          background_color: backgroundColor,
          display: 'standalone',
          scope,
          start_url: startUrl,
          icons,
        });

  return {
    strategies: 'injectManifest',
    registerType: 'prompt',
    filename,
    srcDir: 'node_modules/@openpeepshq/react/dist/pwa',
    manifest: resolvedManifest,
    injectManifest: {
      injectionPoint: undefined,
      ...injectManifest,
    },
    devOptions: devOptions ?? { enabled: false },
  };
};
