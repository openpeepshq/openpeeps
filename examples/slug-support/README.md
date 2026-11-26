# slug-support

Example plugin that gives articles a clean, shareable slug URL. It is the
reference implementation for the `plugins.articles.editor.slug` slot (see
[frontend plugin authoring](../../platform/web/docs/development/plugins/frontend.md)).

## What it does

- Adds a **slug** field to the article editor, with live availability checking
  and optional auto-generation from the title.
- Lets a profile publish an article under `/{handle}/{slug}` (profile-scoped) —
  always available to signed-in authors.
- Lets authors with the configured roles (`admin`, `moderator` by default)
  request an **instance-scoped** `/{slug}` URL — globally unique, gated behind
  a role check on the server.
- Adds two partial unique indexes on `posts.body` (`slug` + scope) so a slug
  is unique per scope and lookups are index-backed.

## Two scopes

| Scope           | URL                | Uniqueness    | Who can use it                 |
| --------------- | ------------------ | ------------- | ------------------------------ |
| Profile-scoped  | `/{handle}/{slug}` | per creator   | Any signed-in author           |
| Instance-scoped | `/{slug}`          | instance-wide | Roles in `instanceScopedRoles` |

A bare `/{slug}` that looks like a profile handle (1–16 chars) is reserved for
the `/:handle` profile route, so instance-scoped slugs must not be handle-shaped.

## Config

Set under `plugins → slug-support` in admin. Defaults shown:

```jsonc
{
  "enabled": true, // master switch; false disables routes + UI
  "maxSlugLength": 100, // upper bound; matches ARTICLE_SLUG_MAX_LENGTH
  "autoGenerate": true, // offer the generate-from-title control
  "allowInstanceScoped": true, // permit the instance-scoped scope at all
  "instanceScopedRoles": ["admin", "moderator"],
}
```

## API

All routes are auth-gated (Bearer token via the host's `authFetch` bridge) and
require `enabled: true` to do anything. They are mounted under
`/api/openpeeps/core/v1/plugins/examples/slug-support/`.

| Route       | Method | Params / body                                                  | Returns                                                                            |
| ----------- | ------ | -------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `/profile`  | GET    | —                                                              | `{ handle, canInstance, instanceScopedRoles }` for the calling user                |
| `/check`    | GET    | `?slug=…` and optional `&instanceScoped=true`                  | `{ available, slug }` — plus `requiresPermission` if instance-scoped is role-gated |
| `/generate` | POST   | `{ title, instanceScoped? }`                                   | `{ slug }` — generated from the title, `-2`/`-3` suffixes on conflict              |
| `/resolve`  | GET    | `?slug=…` and (`profile=@handle` **or** `instanceScoped=true`) | `{ postId }` or `null` — resolves a slug to the post that owns it                  |

`/resolve` accepts exactly one scope marker per request; both or neither is a 400. The web asset uses `/profile`, `/check`, and `/generate`; `/resolve` is
there for other plugin authors who map slug URLs back to posts.

## Editor slot

The plugin registers `web/articleSlugField.js` against
`plugins.articles.editor.slug`. The host passes `postData`, `onChange`, and
`isEdit`. The asset calls its own secured `GET /profile`, `/check`, and
`POST /generate` routes through the host's `authFetch` bridge (the app uses a
Bearer token, not cookies).

## Run locally

The plugin ships no `dev` script (same as the other example plugins) — build
it from the monorepo root:

```bash
pnpm install
pnpm --filter @openpeepshq-examples/slug-support build
```
