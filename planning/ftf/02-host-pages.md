# Host gap: plugin app pages, nav, stylesheets

**OpenPeeps PR 1.** Gives a plugin a real in-shell app, one sidebar item, and
a CSS file. Greeter becomes the fixture.

## Contract

Extend `pluginManifestSchema` in
[`platform/common/src/types/plugins.ts`](../../platform/common/src/types/plugins.ts):

```ts
app: z
  .object({
    basePath: z.string().regex(/^[a-z0-9-]+$/),
    titleKey: z.string(),
    nav: z.boolean().default(true),
    slot: z.string(),
    asset: z.string(),
    stylesheet: z.string().optional(),
  })
  .optional(),
```

`basePath` is unique per loaded plugin. On collision, log and skip nav +
route for the later plugin.

Greeter fixture:

```ts
export const manifest = {
  components: [/* existing header */],
  app: {
    basePath: 'greeter',
    titleKey: 'plugins.greeter.nav',
    nav: true,
    slot: 'plugins.pages.greeter',
    asset: 'web/app.js',
    stylesheet: 'web/app.css',
  },
};
```

## Web routing

Reserved prefix **`/p/:basePath/*`**, declared **inside** `RootLayout` and
**before** `/:handle` in
[`platform/web/src/App.tsx`](../../platform/web/src/App.tsx).

`/p` is not a profile handle. Nested plugin routes (`/p/famly/families/:id`)
stay under that prefix so they never hit `/:handle`.

Host page:

1. Read `basePath` from the URL.
2. Find the loaded manifest whose `app.basePath` matches.
3. Render `<PluginSlot name={app.slot} />` (pass `translate` as today).
4. Unknown `basePath` → existing not-found page.

The plugin bundle does nested routing from the remainder of the path
(`window.location.pathname` minus `/p/${basePath}`). Do not explode the host
router with every FTF screen.

Shell: in-sidebar. Source of truth is the web router (AGENTS.md). Not a
full-screen route.

## Sidebar

[`AppSideBarMenus.tsx`](../../platform/web/src/navigation/AppSideBarMenus.tsx)
is a hardcoded list. After the manifest fetch, for each `app.nav === true`
insert one `NavItem` to `/p/${basePath}`. Label: `t(titleKey)`. Icon: reuse
an existing lucide icon (e.g. `Users`) in v1; do not add a plugin icon
registry yet.

## Stylesheets

[`PluginLoader`](../../platform/react/src/components/registry/PluginLoader.tsx)
only injects `<script>`. Also inject `app.stylesheet` (and keep supporting
IIFE-inserted links) as:

```
<link rel="stylesheet" href="/plugin-assets/<ns>/<name>/<stylesheet>" />
```

Same `web/` confinement as scripts
([`pluginAssetsMiddleware`](../../platform/server/src/lib/plugins.ts)).
Deduplicate by `href`. Remove owned links on unmount the same way scripts
are removed.

Host Tailwind still does not scan plugin sources. Plugin CSS must be
self-contained and should use theme tokens:

- `rgb(var(--color-primary))` etc. from
  [`frontend.md`](../../platform/web/docs/development/plugins/frontend.md)
- No `gray-300` / `blue-500` in plugin UI (same rule as host)

## Native stub

[`nativeRouter.tsx`](../../platform/rn-components/src/components/navigation/nativeRouter.tsx)
has no plugin routes. Add a named screen for `/p/:basePath` that shows
existing i18n copy (new keys under `plugins.nativeUnsupported` in en + de).
Do **not** load IIFE plugins in RN in v1.

Keep web and this stub in the same OpenPeeps change.

## Manifest API

[`GET .../plugins/manifest`](../../platform/server/src/api/openpeeps/core/v1/plugins/manifest/GET.ts)
already passthrough-extends `pluginManifestSchema`. Once the schema gains
`app`, the client sees it. `PluginLoader` and the sidebar should read `app`
from that payload (not a second endpoint).

## Docs and tests

- Document `app`, `/p/:basePath`, CSS injection, and the `/:handle` rule in
  `plugins.md` + `frontend.md`.
- Greeter: one page at `/p/greeter` that prints the configured greeting.
- Unit tests: `basePath` validation; reserved-prefix helper; stylesheet URL
  builder.
- Do not bump host `CHANGELOG.md` by hand.

## Out of this PR

Persistence, jobs, FTF itself, RN plugin renderer, per-plugin icons,
multiple nav items per plugin.
