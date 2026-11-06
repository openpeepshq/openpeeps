# Plugin port (new repository)

The product plugin lives in a **new repository**, distinct from:

1. OpenPeeps (host contract, greeter fixture, `/p/:basePath`, persistence, jobs)
2. The current ForTheFamly SaaS codebase (Next.js, auth, Stripe, marketing at
   forthefamly.org)

Treat the SaaS tree as a **reference to port from**, not as the plugin
checkout. Do not reshape ForTheFamly into a plugin package. Install onto a
community via git or the plugin store once host range includes pages +
persistence + jobs.

Suggested plugin key: `senatmade/forthefamly`. Repo URL is chosen when the
repo is created; it is not the OpenPeeps monorepo and not
`senatmade-openpeeps/ForTheFamly`.

## Package shape

The new repo is the scanned plugin package:

```
package.json          # name @senatmade/forthefamly, "type": "module",
                      # openpeeps.enabled, peerDependencies on
                      # @openpeepshq/core, @openpeepshq/common, express, zod
src/index.ts          # routes, persistence, jobs, configSchema, locales, manifest
src/api/              # Express handlers (ported from src/app/api)
src/db/schema.ts      # Drizzle types for the plugin schema only
sql/NNNN_*.sql        # applied by the host
web/app.js            # esbuild IIFE
web/app.css
locales in src/index  # { en, de } under plugins.forthefamly.*
```

Backend entry compiles to `dist/index.js` (ESM). UI is **not** that file.

Do not copy Next.js, Resend, Stripe, MDX, or the marketing
`src/app/(marketing)` tree into the plugin repo. Port only the v1 domain
(see [05-domain-mapping.md](05-domain-mapping.md)).

## Manifest

```ts
export const manifest = {
  components: [
    {
      slot: 'plugins.admin.configuration.famly',
      asset: 'web/app.js',
      componentKey: 'senatmade/forthefamly/admin-config',
    },
  ],
  app: {
    basePath: 'famly',
    titleKey: 'plugins.forthefamly.nav',
    nav: true,
    slot: 'plugins.pages.famly',
    asset: 'web/app.js',
    stylesheet: 'web/app.css',
  },
};
```

One bundle can register both the page slot and the admin configuration slot.

## UI

Rebuild screens; do not iframe Next.js.

| Route (under `/p/famly`) | Screen |
| --- | --- |
| `/` | Adult home, or redirect to `/kid` when role is child |
| `/kid` | Kid home |
| `/families` | Family list |
| `/families/:id` | Family hub |
| `/families/:id/history` | Agreement history |
| `/agreements/new` | Create |
| `/agreements/:id` | Detail (signoff, proof, thread, extensions) |
| `/stars` | Stars / Zuki / rewards |
| `/chats` | Shared-moments inbox |
| `/admin` | Announcements, challenges (community admin or parent) |
| `/invite/:token` | Accept family invite |
| `/settings` | Plugin prefs only (appearance/Zuki); host settings stay at `/settings` |

Nested router inside the page slot (React Router is already on `window` only
for the host — the plugin should parse the path remainder with a tiny helper
or a bundled router; do **not** nest another `BrowserRouter` that steals
host navigation). Prefer `useEffect` + host `RouterAdapter` if exposed;
otherwise read `location.pathname` and `history.pushState` scoped under
`/p/famly`.

Theme: CSS variables / `__OPENPEEPS_THEME__`. Semantic tokens only.

i18n: plugin `locales`, keys `plugins.forthefamly.*`. Never hardcode
user-facing copy. en + de in the same change.

Zuki / illustrations: static assets under `web/illustrations/…` served by
plugin-assets.

esbuild:

- Format IIFE, `react` and `react-dom` external, globals `React` / `ReactDOM`
- Call hooks as `React.useState`
- Register via `window.__OPENPEEPS_PLUGINS__.registerComponent`

## Backend

`src/index.ts`:

```ts
export const persistence = { migrations: 'sql' };
export const routes = async (router) => { /* mount api/* */ };
export const jobs = async () => ({ recurrence, nudges, rankSnapshot, checkInPrompt });
export const configSchema = { schema, defaults };
export const locales = { en, de };
export const manifest = { … };
```

Optional `interceptors`: `profileCreated` to insert empty `user_stats`.

Auth middleware: `ensurePluginAuth()`, load memberships for
`req.pluginProfile.id`, attach `req.famly` (families + roles). 403 when the
route needs a family the profile is not in.

## Port sequence (new plugin repo)

Copy and adapt from the ForTheFamly SaaS as needed. Leave that SaaS repo
unchanged except where a later, separate change wants to point marketing at
the OpenPeeps plugin.

1. **Create the repo** — OpenPeeps plugin package skeleton (`package.json`,
   `src/index.ts`, empty `sql/`, esbuild for `web/`).
2. **Skeleton** — empty schema, `GET /hello`, empty `/p/famly` shell,
   installable on local OpenPeeps (`PLUGINS_PATH` or git install).
3. **Membership** — families, memberships, invites.
4. **Agreements** — CRUD, signoff, proof media, messages, reactions,
   extensions, counter-proposals, archive.
5. **Adult UI** for 3–4.
6. **Gamification** — points, streaks, stats, rewards, redemptions.
7. **Kid home** + stars.
8. **Check-ins, shoutouts, announcements, challenges.**
9. **Jobs** + host notifications.

## Host range

`package.json` / store listing `hostRange` must require the OpenPeeps
version that contains PRs 1–3 (pages, persistence, jobs). Do not publish a
tarball that loads as a header-only greeter on old hosts.

## Out of this port

Marketing, blog, PWA install CTA, FTF auth, Stripe, Work seats,
platform-admin, native FTF screens, OpenPeeps group mapping.
