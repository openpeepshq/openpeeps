# Plugin System

> Implementation guide and contract for OpenPeeps plugins.

---

## 1. How Plugins Work

OpenPeeps ships with a lightweight plugin loader that runs at boot time.

### Plugin Contract

A plugin is a folder at `plugins/<namespace>/<name>/` with a `package.json` and a backend entry point `src/index.ts` that compiles to `dist/index.js`.

### Backend Exports

| Export         | Required | Purpose                                                                                       |
| -------------- | -------- | --------------------------------------------------------------------------------------------- |
| `interceptors` | No       | Map of `CoreEvents` handlers (`postCreated`, `profileCreated`, `jamRecordingCompleted`, etc.) |
| `routes`       | No       | Express `Router` factory — receives a fresh `Router` instance                                 |
| `configSchema` | No       | `{ schema: () => ZodSchema, defaults: object }` for admin config UI                           |
| `manifest`     | No       | Frontend component manifest (see §5)                                                          |

### Backend Loading

1. **Scan:** `initializePlugins()` reads `config.plugins.path` (default `path.join(base, '../plugins')`) and enumerates subdirectories matching `package.json`.
2. **Enable:** A plugin is skipped unless its `package.json` contains `{ "openpeeps": { "enabled": true } }`. Omitting the field also enables the plugin; set `"enabled": false` to disable it without removing the folder.
3. **Sort:** Plugins are topologically sorted by `dependencies` declared in `package.json`. Cycles or unresolved dependencies are logged and dropped.
4. **Load:** Each plugin is dynamically imported via `import(\`${pluginPath}/dist/index.js\`)`.
5. **Hook:** If the module exports `interceptors()`, handlers are registered on the core event `hub`.
6. **Config:** If the module exports `configSchema`, it is registered via `registerConfigSchema(namespace, name, …)`. The namespace matches the plugin's directory namespace (`plugins/<namespace>/<name>/`).
7. **Manifest:** If the module exports `manifest`, it is stored and exposed by `GET /api/openpeeps/core/v1/plugins/manifest`.

---

## 2. API Endpoints

Core endpoints exposed for plugin discovery:

| Method | Path                                                  | Description                                                                      | Auth          |
| ------ | ----------------------------------------------------- | -------------------------------------------------------------------------------- | ------------- |
| `GET`  | `/api/openpeeps/core/v1/plugins`                      | Loaded plugin metadata (key, namespace, name, version, displayName, description) | None          |
| `GET`  | `/api/openpeeps/core/v1/plugins/config`               | Merged plugin config tree                                                        | Auth required |
| `GET`  | `/api/openpeeps/core/v1/plugins/manifest`             | Frontend component manifests per plugin                                          | None          |
| `any`  | `/api/openpeeps/core/v1/plugins/<namespace>/<name>/*` | Plugin-defined Express routes                                                    | _See §3_      |

---

## 3. Plugin Routes and Security

**Important: Plugin routes are mounted as raw Express Routers **before** the Riddl catch-all.** This means they bypass Riddl's built-in authentication, authorization, and error-handling pipelines.

### Responsibility

Plugin authors **must** implement their own authentication and capability checks if routes require protection. Riddl's `ensureRoleCapabilities`, `ensureAccess`, and similar helpers are not available in plugin routes.

### Example: Auth-protected plugin route

```ts
import type { Router } from 'express';
import { ensurePluginAuth } from '@openpeeps/core/plugins';

export const routes = async (router: Router) => {
  router.get('/secure-data', ensurePluginAuth(), async (req, res) => {
    // req.pluginProfile is set to { id: string } when the token is valid.
    // Note: this helper only verifies the JWT signature and the presence of a
    // profile identity. It does not expose the handle or check revocation.
    res.json({ data: 'secret', profile: req.pluginProfile });
  });
};
```

### Best Practices

1. **Default to authenticated:** If your plugin serves sensitive data, always require auth.
2. **Minimize exposed endpoints:** Only expose what plugins/app needs.
3. **Validate input:** Use Zod schemas in plugin route handlers.

---

## 4. Frontend Plugin System

The frontend uses a **slot-based registry**. Plugins ship plain JavaScript IIFE bundles that call `window.__OPENPEEPS_PLUGINS__.registerComponent(slot, key, Component)`.

### React API

| Symbol                   | Location                      | Purpose                                                                     |
| ------------------------ | ----------------------------- | --------------------------------------------------------------------------- |
| `PluginRegistryProvider` | `@openpeeps/react/components` | Context owning slot/component state; exposes `window.__OPENPEEPS_PLUGINS__` |
| `PluginLoader`           | `@openpeeps/react/components` | Fetches manifest, injects `<script>` tags for each declared asset           |
| `PluginSlot`             | `@openpeeps/react/components` | Renders all components registered for a named slot                          |
| `usePluginRegistry`      | `@openpeeps/react/components` | Direct access to `registerComponent` and `getComponentsForSlot`             |

### Usage example

```tsx
import { PluginSlot } from '@openpeeps/react/components';

function SomePage() {
  return (
    <>
      <PluginSlot name="plugins.header" />
      <main>core content</main>
      <PluginSlot name="plugins.footer" />
    </>
  );
}
```

### Manifest Schema (Zod)

```ts
const pluginManifestSchema = z.object({
  components: z
    .array(
      z.object({
        slot: z.string(),
        asset: z.string(),
        componentKey: z.string(),
      }),
    )
    .default([]),
});
```

---

## 5. Plugin Frontend Bundles

Plugin bundles are served from `/plugin-assets/<namespace>/<name>/<asset>` and should use the global `window.React` object exposed by `PluginRegistryProvider`.

```js
// plugins/<namespace>/<name>/web/widget.js
const Widget = () => React.createElement('div', null, 'Hello!');
window.__OPENPEEPS_PLUGINS__.registerComponent(
  'plugins.header',
  'my-ns/my-plugin/widget',
  Widget,
);
```

### Build Contract (IMPORTANT)

1. **React must be external.** Plugin builds must declare `react` and `react-dom` as `peerDependencies` or `external`. Bundling your own React instance causes "Invalid Hook Call" errors.
2. **Target `esm` or `iife` for `web/` bundles.** The `dist/index.js` backend entry uses ESM; frontend bundles use IIFE.
3. **Asset naming must match manifest.** The `asset` field in the manifest must exactly match the filename in your `web/` directory.
4. **Do not rely on the host Tailwind classes.** The host app's Tailwind build only scans its own source tree, so utility classes used exclusively inside a plugin bundle (e.g. `bg-primary/10`) are not guaranteed to exist in the final CSS. Ship your own stylesheet or use inline styles for reliable styling.

### Example Plugin Build (Vite)

```ts
// plugins/my-ns/my-plugin/vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: ['react', 'react-dom', '@openpeeps/core'],
    },
  },
});
```

---

## 6. Plugin Static Assets

Server serves plugin frontend assets at:

```
GET /plugin-assets/<namespace>/<name>/<path>
```

Path traversal is guarded: requests to paths outside the plugin directory return `403 Forbidden`.

---

## 7. Example Plugin

A working example lives at `plugins/openpeeps/greeting/`:

- `src/index.ts` — backend entry with `interceptors`, `routes`, `configSchema`, `manifest`
- `web/greeting.js` — frontend IIFE bundle
- `package.json` — declares `@openpeeps/core` and `@openpeeps/common` as dependencies

Build: `pnpm --filter @openpeeps-plugins/greeting build`

---

## 8. Open Decisions

1. **No sandboxing.** Plugins run in the same Node process with full access to `@openpeeps/core` and the Express app. Plugin installation = server code execution.
2. **No signing/validating manifests.** `pluginManifestSchema.parse()` validates structure; semantic trust of manifest content is the server operator's responsibility.
3. **No npm registry.** Plugins are installed manually as subdirectories.
4. **Plugin enumeration is public.** `GET /plugins` and `GET /plugins/manifest` return plugin names, versions, and manifest metadata without authentication. This is considered acceptable metadata disclosure, but operators should be aware that plugin names/versions may leak implementation details.

## 9. Deployment

The example Traefik stack (`traefik/docker-compose.yml`) loads plugins from a
volume-mounted directory (`../plugins:/plugins`). The mounted tree must be a
built workspace: each plugin needs its own `node_modules` (so pnpm workspace
symlinks resolve) and a compiled `dist/index.js`. Before starting the stack:

```sh
pnpm install
pnpm -r --filter "*plugins*" build
```

Then start the stack:

```sh
cd traefik
cp .env.example .env
# edit .env and set SERVICE_DOMAIN
docker compose up -d --build
```
