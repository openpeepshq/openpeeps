# Plugin Development Guide (Back-end)

A plugin's back end is a Node module. The server loads `dist/index.js` at boot, in the same process as the API, and calls the exports you provide. This page is the authoring guide. The [plugin contract](/docs/development/plugins) covers discovery, deployment, and the front end.

A working reference lives at `examples/greeter-plugin/`.

## Layout

Scanned plugins live at `plugins/<namespace>/<name>/`:

```
plugins/my-org/my-plugin/
  package.json
  tsconfig.json
  src/index.ts      # compiles to dist/index.js
```

`<namespace>` and `<name>` are the plugin key (`my-org/my-plugin`). Routes, config, and admin UI all use that key. Both segments must match `[a-z0-9-]+` if the plugin also serves files under `web/`.

Folders outside `plugins/` (for example `examples/greeter-plugin/`) are not scanned. They load only when the repo root `package.json` lists them:

```json
{
  "openpeeps": {
    "plugins": ["examples/greeter-plugin"]
  }
}
```

A referenced plugin's key is `examples/<folder name>`, so the greeter reads config as `config('examples', 'greeter-plugin')`.

## package.json

```json
{
  "name": "@my-org/my-plugin",
  "version": "0.1.0",
  "type": "module",
  "openpeeps": { "enabled": true },
  "dependencies": {
    "@openpeepshq/core": "workspace:^",
    "@openpeepshq/common": "workspace:^",
    "express": "^5.2.1",
    "zod": "^4.4.3"
  }
}
```

`"type": "module"` is required. The loader imports `dist/index.js` as ESM.

`openpeeps.enabled` gates scanned plugins. Omitting it loads the plugin. `"enabled": false` skips it and records status `disabled`. An admin enable/disable toggle stored in the database overrides this field. Referenced plugins have no separate flag: listing the path is what loads them.

If one plugin imports another, declare that package in `dependencies`. The loader sorts plugins by those dependencies and drops a plugin that would form a cycle.

## Entry exports

`src/index.ts` may export any of these. All are optional.

| Export         | Shape                                             | When it runs                                        |
| -------------- | ------------------------------------------------- | --------------------------------------------------- |
| `interceptors` | `async () => Partial<CoreEvents>`                 | After import; each handler is subscribed on the hub |
| `routes`       | `async (router: Router) => void`                  | When the server mounts plugin routers               |
| `configSchema` | `{ schema: () => ZodSchema, defaults: object }`   | After import; registered for the admin config UI    |
| `locales`      | `{ en: { … }, de: { … } }`                        | After import; merged into the host i18n catalog     |
| `manifest`     | `{ components: { slot, asset, componentKey }[] }` | Stored for the front-end loader                     |

Use named exports. Import host packages from the package root or one subpath (`@openpeepshq/core/plugins`, `@openpeepshq/core/config`, `@openpeepshq/core/log`).

## Events

`interceptors()` returns a map of core event names to handlers. Unknown names are logged and ignored. A thrown handler is logged and does not fail the action that emitted the event.

Interceptors observe events after they are published on Redis. They cannot cancel or roll back the action. Payloads are JSON, so `Date` values arrive as strings.

| Event                    | Arguments                                                      |
| ------------------------ | -------------------------------------------------------------- |
| `profileCreated`         | `profile`                                                      |
| `postCreated`            | `post`                                                         |
| `jamRecordingCompleted`  | `recording`                                                    |
| `followCreated`          | `follower`, `followed`                                         |
| `notificationCreated`    | `notification`                                                 |
| `reactionCreated`        | `profile`, `post`, `reaction`                                  |
| `entryCreated`           | `profile`, `post`, `entry`                                     |
| `rsvpCreated`            | `profile`, `post`, `{ type: 'rsvp', data, previousResponse? }` |
| `postAnnounced`          | `post`                                                         |
| `configUpdated`          | `namespace`, `name`                                            |
| `profileSettingsUpdated` | `profileId`                                                    |
| `pollEnded`              | `post`                                                         |

```ts
export const interceptors = async () => ({
  postCreated: async (post: { id: string }) => {
    log.info({ postId: post.id }, 'post created');
  },
});
```

## Routes

`routes` receives a fresh Express `Router`. The server mounts it at:

```
/api/openpeeps/core/v1/plugins/<namespace>/<name>
```

Declare relative paths (`router.get('/hello', …)`), not the prefix.

These routers are mounted before the Riddl API catch-all, so they do not pass through Riddl authentication, capability checks, or error handling. Protect any route that returns private data with your own middleware. `ensurePluginAuth` from `@openpeepshq/core/plugins` verifies `Authorization: Bearer <jwt>` and sets `req.pluginProfile` to `{ id }`. It checks the signature and that a profile id is present. It does not check revocation, and it does not load the profile. Look the profile up yourself when you need the handle or a capability.

Validate request bodies with Zod before using them.

```ts
import type { Router } from 'express';
import { z } from 'zod';
import { ensurePluginAuth } from '@openpeepshq/core/plugins';

const bodySchema = z.object({ note: z.string().min(1).max(500) });

export const routes = async (router: Router) => {
  router.post('/notes', ensurePluginAuth(), (req, res) => {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Invalid body' });
      return;
    }
    res.json({ profileId: req.pluginProfile?.id, note: parsed.data.note });
  });
};
```

That handler is `POST /api/openpeeps/core/v1/plugins/<namespace>/<name>/notes`.

## Config

Export `configSchema` so admins can edit settings in the same UI as core config. `schema` is a factory (it is called when the value is read and when it is saved). `defaults` fill any key the admin has not set.

Read the saved value with `config(namespace, name)` from `@openpeepshq/core/config`, using the same namespace and name as the plugin key. Call it when you need the value. The host refreshes that cache when an admin saves, then emits `configUpdated`.

```ts
import { z } from 'zod';
import { config } from '@openpeepshq/core/config';

const pluginConfigSchema = () =>
  z.object({
    greeting: z.string().default('Hello'),
  });

export const configSchema = {
  schema: pluginConfigSchema,
  defaults: { greeting: 'Hello' },
};

const readConfig = async () =>
  pluginConfigSchema().parse(await config('my-org', 'my-plugin'));
```

## Locales

Export `locales` as a map of language code to a nested object, the same shape as `platform/i18n` locale files. The host merges them into `GET /i18n/:lang`. Prefer keys under your plugin (`plugins.myOrg.myPlugin.title`). Host strings win when a key collides. Put configuration-menu chrome at `configuration.plugins.<slug>.title` and `.description`.

## Build and load

Compile `src/index.ts` to `dist/index.js` before the server starts. The greeter does this with `tsc`:

```sh
pnpm --filter @openpeepshq-examples/greeter-plugin build
```

The loader imports that file by absolute path. Node caches the module, so a rebuild is picked up by restarting the API process. The admin Plugins page can reload plugins; that remounts routes from modules already imported in the process.

On failure the plugin is recorded with status `failed` and the error message, and the rest of the server still boots. `GET /api/openpeeps/core/v1/plugins` lists key, version, and status.

Plugins run with full access to `@openpeepshq/core` and the Express app. Installing a plugin is the same as deploying server code. Treat plugin dependencies and route handlers with the same care as core.
