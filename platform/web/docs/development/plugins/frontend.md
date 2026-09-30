# Plugin Development Guide (Front-end)

A plugin's UI is a script under `web/`. The host loads that script in the web app and the script registers React components into named slots. This page is the authoring guide. The [plugin contract](/docs/development/plugins) covers discovery, deployment, and the server module that exports `manifest`.

A working reference is `examples/greeter-plugin/` (`web/greeter.js` and the `manifest` export in `src/index.ts`).

## How a component gets on screen

1. The server module exports `manifest`. The host publishes it at `GET /api/openpeeps/core/v1/plugins/manifest`.
2. `PluginLoader` reads that list and appends a classic `<script>` for each component. The URL is `/plugin-assets/<namespace>/<name>/<asset>`.
3. The script calls `window.__OPENPEEPS_PLUGINS__.registerComponent(slot, componentKey, Component)`.
4. A `PluginSlot` with that name renders every component registered for it.

The registry queues calls that arrive before the provider mounts, so the script can register as soon as it loads. Registering the same `componentKey` in the same slot again replaces the previous component.

A failed script logs `[openpeeps] Plugin script load failed: <url>` and is removed. A failed manifest fetch is logged and does not block the rest of the app. A component that throws while rendering is caught: that slot shows the host string `plugins.errorBoundary`, and the other components in the slot still render.

## Manifest

Export `manifest` from `src/index.ts` (the same module as `routes` and `configSchema`):

```ts
import type { PluginManifest } from '@openpeepshq/common';

export const manifest: PluginManifest = {
  components: [
    {
      slot: 'plugins.header',
      asset: 'web/widget.js',
      componentKey: 'my-org/my-plugin/header',
    },
  ],
};
```

| Field          | Meaning                                                                                          |
| -------------- | ------------------------------------------------------------------------------------------------ |
| `slot`         | Host slot the component should appear in. See [Slots](#slots).                                   |
| `asset`        | Path relative to the plugin root. The file must resolve inside `web/`.                          |
| `componentKey` | Id passed to `registerComponent`. Use `<namespace>/<name>/<piece>` so it does not collide.      |

`asset` is appended as-is. `web/widget.js` is served at `/plugin-assets/my-org/my-plugin/web/widget.js`. The script must register the same slot and key. The loader does not check that they match.

`<namespace>` and `<name>` must match `[a-z0-9-]+`. Anything else is rejected when the asset is requested.

## The bundle

The loader injects a classic script (`async`, no `type="module"`). Ship an IIFE. `import` and `export` in that file do not run.

Use `window.React`. The host assigns it to the app's React before your script runs. Bundling a second copy of React throws an invalid hook call. Call hooks as `React.useState` on that global.

```js
(() => {
  const registerComponent = (window.__OPENPEEPS_PLUGINS__ || {})
    .registerComponent;

  const Widget = ({ translate }) =>
    React.createElement(
      'div',
      null,
      translate('plugins.myOrg.myPlugin.title', {
        defaultValue: 'Hello',
      }),
    );

  if (typeof registerComponent === 'function') {
    registerComponent('plugins.header', 'my-org/my-plugin/header', Widget);
  }
})();
```

Every slot passes `translate`, the host `t()` function. Plugin strings belong in the server module's `locales` export (`{ en: { … }, de: { … } }`, the same nested shape as `platform/i18n` locale files) so this function can see them. Prefer keys under your plugin (`plugins.myOrg.myPlugin.title`). Host keys win when a key collides.

The greeter is a hand-written script and has no front-end build. If you compile JSX, emit an IIFE into `web/`, mark `react` and `react-dom` external, and map those imports to the globals `React` and `ReactDOM`. Leave `dist/index.js` as the ESM server entry; that file is not the UI bundle.

## Slots

These are the slots the web app renders today. A component registered for any other name stays in the registry until some future `PluginSlot` asks for it.

| Slot                                   | Page                                              | Extra props                                      |
| -------------------------------------- | ------------------------------------------------- | ------------------------------------------------ |
| `plugins.header`                       | Community feed and the Plugins page               | —                                                |
| `plugins.footer`                       | Plugins page                                      | —                                                |
| `plugins.admin.analytics.<slug>`       | `/admin/analytics/<slug>`                         | `analyticsRange`, `analyticsGroups`              |
| `plugins.admin.configuration.<slug>`   | `/admin/configuration/<slug>`                     | —                                                |

`<slug>` is one kebab-case segment: lowercase letters, digits, and single hyphens (`ai-insights`). A second dot (`plugins.admin.analytics.ai.extra`) is ignored, and the page redirects away.

### Analytics

Reserved slugs, which do not get a tab: `members`, `content`, `engagement`, `groups`, `reports`, `growth`, `retention`.

A valid registration adds a tab on Analytics, placed before Reports. The label is `t('admin.analytics.tabs.<slug>')`, falling back to the slug with each word capitalized (`ai-insights` → `Ai Insights`). Ship that key from `locales` when the capitalized slug is the wrong label.

The slot receives:

```js
analyticsRange; // { preset?: '7d' | '30d' | '3m' | '6m' | '12m' | 'all', from?: string, to?: string }
analyticsGroups; // { id: string, name: string }[]
```

`analyticsRange` starts as `{ preset: '30d' }` and follows the range control in the page header. A custom range sets `from` and `to` instead of `preset`. `analyticsGroups` is the admin group list and can be empty while that list is loading. Read both off the component props. The host re-renders the slot when they change.

### Configuration

Reserved slugs, which do not get a menu row: `community`, `email`, `i18n`, `sso`, `server`, `server-settings`.

A valid registration adds a row on `/admin/configuration` and a page at `/admin/configuration/<slug>`. The row title and description are `configuration.plugins.<slug>.title` and `configuration.plugins.<slug>.description`. The page heading uses the title. Without those keys the title falls back to a capitalized slug (`peeps-ai` → `Peeps AI`; a segment of two letters or fewer is uppercased) and the description falls back to "Configure this plugin."

## Theme

Read the community theme from CSS variables or from `window.__OPENPEEPS_THEME__`. Both track the signed-in profile's light or dark preference.

Color variables are space-separated RGB channels (`--color-primary: 12 144 167`), set on `body`. Use them as `rgb(var(--color-primary))` or `rgb(var(--color-primary) / 0.5)`.

| Variable                       | Meaning                                                          |
| ------------------------------ | ---------------------------------------------------------------- |
| `--color-primary`              | Community primary color                                          |
| `--color-primary-foreground`   | Text or icon color on `--color-primary`                          |
| `--color-secondary`            | Community secondary color                                        |
| `--color-secondary-foreground` | Text or icon color on `--color-secondary`                        |
| `--color-surface`              | Neutral panel background                                         |

For inline styles, the host also publishes ready `rgb(...)` strings:

```js
const theme = window.__OPENPEEPS_THEME__ || {};
const primary = theme.primary || 'rgb(37 99 235)';
```

`secondary` and `secondaryForeground` are omitted when the community has not set a secondary color. Any key can be missing on an older host. Reading the object once, at script evaluation, keeps that snapshot for the life of the page. Read it inside the component function when the widget should pick up a theme change that causes a re-render. Changing the object on `window` does not by itself re-render the component.

## Styles

The host Tailwind build scans the app source, so a utility class that appears only inside your bundle is often missing from the shipped CSS. Style with inline styles or with a stylesheet you attach yourself. The asset middleware will serve a file under `web/` (for example `web/widget.css` at `/plugin-assets/<namespace>/<name>/web/widget.css`), and the loader does not inject `<link>` tags. Insert the link from the IIFE if you ship CSS.

## Assets

`GET /plugin-assets/<namespace>/<name>/<path>` sends a file only when all of these hold:

- The plugin is loaded.
- `<namespace>` and `<name>` match `[a-z0-9-]+`.
- The resolved file sits inside that plugin's `web/` directory.

`web/../dist/index.js` is rejected. A query string on the script URL is ignored for path resolution. The directory is the plugin's real path, including referenced plugins under `examples/`.
