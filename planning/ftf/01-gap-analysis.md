# Gap analysis

Compare ForTheFamly’s product surface with the plugin contract in
[`platform/web/docs/development/plugins.md`](../../platform/web/docs/development/plugins.md),
[`frontend.md`](../../platform/web/docs/development/plugins/frontend.md), and
[`backend.md`](../../platform/web/docs/development/plugins/backend.md).

## What a plugin can do today

| Export / host feature | What it gives FTF |
| --- | --- |
| `routes(router)` | Express router at `/api/openpeeps/core/v1/plugins/<ns>/<name>`. No Riddl auth; use `ensurePluginAuth` from `@openpeepshq/core/plugins`. |
| `configSchema` | Admin settings on `/admin/configuration/<slug>` |
| `locales` | Merged into host `t()` |
| `manifest.components` | IIFE widgets into named slots |
| `interceptors` | Observe-only `hub.on` for `VALID_EVENT_KEYS` |
| Static assets | `GET /plugin-assets/<ns>/<name>/web/...` |
| Admin analytics slot | `plugins.admin.analytics.<slug>` |
| Admin configuration slot | `plugins.admin.configuration.<slug>` |
| Install | npm / git / marketplace (`core-plugins-manage`) |

Rendered slots (nothing else is asked for by the host):

| Slot | Where |
| --- | --- |
| `plugins.header` | Local feed, Plugins page |
| `plugins.footer` | Plugins page |
| `plugins.admin.analytics.<slug>` | `/admin/analytics/<slug>` |
| `plugins.admin.configuration.<slug>` | `/admin/configuration/<slug>` |

`plugins/` in the OpenPeeps repo is empty. The only real plugin is
`examples/greeter-plugin/` (header widget, `GET .../hello`, one config string).

De facto (same process, **not** a contract): import `@openpeepshq/core` and
touch DB, queues, `maybeCreateNotification`, `registerNotificationHandler`.
FTF must not depend on this remaining informal.

## What ForTheFamly needs for v1

A member-facing app, not a feed widget:

- Adult home (due agreements, activity)
- Kid home (stars, Zuki, simplified agreements)
- Family list + family hub
- Agreement create / detail (signoff, proof, messages, reactions, extensions, counter-proposals)
- Stars / rewards
- Weekly check-ins, shoutouts
- Recurrence, nudges, weekly rank snapshots
- Family invites (into an existing community profile)
- Tenant-admin-ish settings for community admins + parents

It currently owns all of that itself: Next.js App Router, cookie sessions,
31 Drizzle tables, Resend, Stripe, Vercel crons, web-push, MDX blog.

## Blockers

| Need | Current surface | Why it blocks |
| --- | --- | --- |
| Member-facing pages + nav | Slots only. [`App.tsx`](../../platform/web/src/App.tsx) has no plugin catch-all; [`AppSideBarMenus.tsx`](../../platform/web/src/navigation/AppSideBarMenus.tsx) is hardcoded. `/:handle` would swallow an unprefixed plugin path. | Agreements cannot live in `plugins.header`. |
| Owned Postgres tables | No plugin migration export. Core schema is host-owned (`public`). | ~20 domain tables have nowhere legal to live. |
| Scheduled work | [`platform/worker/src/index.ts`](../../platform/worker/src/index.ts) never calls `initializePlugins()`. Interceptors are live Redis `hub.on`, not BullMQ. | Recurrence / check-ins / ranks / nudges are cron-shaped. |
| App CSS | [`PluginLoader`](../../platform/react/src/components/registry/PluginLoader.tsx) injects `<script>` only. Host Tailwind does not scan plugin sources. | A multi-page UI cannot be all inline styles. |
| Plugin-originated notifications | `registerNotificationHandler` also binds `hub.once` to a **core** event. `maybeCreateNotification` can insert a row, but push/email needs a `pushRenderer` in the handler map. | Agreement nudges must notify without pretending to be `postCreated`. |
| Native | No plugin registry in `platform/rn-components`. | v1 is web, but shell routes must still be named (not a one-off `if`). |

## Not blockers for v1

| Topic | Why it can wait |
| --- | --- |
| Extra CoreEvents (`groupMemberAdded`, `postUpdated`, …) | FTF owns its writes; interceptors are optional (`profileCreated` to seed stats). |
| Host capabilities / roles | Store `parent\|child\|mentor\|guardian` on plugin memberships; gate plugin routes in the plugin. |
| Plugin email templates | Host notification email via a registered `pushRenderer` / email path. |
| Stripe / trials / Work seats | Out of v1. |
| Mapping families onto OpenPeeps groups | Group roles do not match; keep plugin-owned families. |
| RN plugin runtime | Stub screen only. |
| Sandboxing | Plugins already run in-process; namespaced SQL is hygiene, not isolation. |
| ESM UI modules | Keep classic IIFE; esbuild with `react`/`react-dom` external. |

## Verdict

The current API is enough for a greeter and for admin config tabs. It is not
enough for ForTheFamly. Close pages + CSS, persistence, jobs, and a
notification-type registration that is not tied to CoreEvents. Then port the
product into a **new plugin repository** (not OpenPeeps, not the current
ForTheFamly SaaS codebase).
