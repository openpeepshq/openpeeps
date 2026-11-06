# Host gap: plugin SQL persistence

**OpenPeeps PR 2.** Lets a plugin own tables without writing core
`platform/core/src/db/pg/schema/` migrations.

## Why not `public`

Core schema is host-owned (see
[`postgres-schema-adr.md`](../../platform/core/docs/postgres-schema-adr.md)).
Plugin tables in `public` would collide, skip the Drizzle generate flow, and
make uninstall/restore undefined.

FTF v1 needs on the order of 20 tables (families, memberships, agreements,
signoffs, messages, rewards, …). JSON in `configs` is not a substitute.

## Contract

Optional export from `dist/index.js`:

```ts
export const persistence = {
  migrations: 'sql', // directory relative to the plugin root
};
```

Host derives the Postgres schema name from the plugin key:

```
plugin_<namespace>_<name>   // senatmade/forthefamly → plugin_senatmade_forthefamly
```

Replace `/` and `-` with `_`. Must match `^[a-z][a-z0-9_]*$`. Do **not** let
the plugin pick an arbitrary schema (avoids `public` / `drizzle`).

`migrations` is a folder of numbered files, same spirit as core:

```
sql/0001_init.sql
sql/0002_rewards.sql
```

Filenames: `NNNN_snake_case_what_it_does.sql`. Apply in sort order.

## Boot

In [`initializePlugins`](../../platform/core/src/plugins/index.ts), after a
successful `import(dist/index.js)` and before marking `loaded`:

1. `CREATE SCHEMA IF NOT EXISTS plugin_<ns>_<name>`
2. Ensure a ledger table in that schema, e.g. `plugin_migrations (filename text primary key, applied_at timestamptz)`
3. Apply pending files in a transaction per file
4. On failure: plugin status `failed`, skip routes/jobs for that plugin, do
   not abort host boot

Run this on **server and worker** (worker will load plugins in PR 3).
Idempotent: already-applied filenames are skipped.

Reload (`reloadPlugins`) must not re-apply. It may run newly added files.

## Plugin query access

Document a helper, e.g. `pluginDb(namespace, name)` on
`@openpeepshq/core/plugins`, that returns the host `pg` client with
`search_path` set to that plugin schema (and `public` only if the plugin
must join `profiles` — prefer passing profile ids from `ensurePluginAuth`
and joining in SQL with fully-qualified `public.profiles` when needed).

Plugins must not create tables in `public`. Host code must not read plugin
schemas except backup/restore.

## Backup / restore

Core backups already archive plugins on disk
([`platform/core/src/backups`](../../platform/core/src/backups)). Include
plugin schemas in DB dump/restore (pg_dump by schema name, or dump all
`plugin_*` schemas). Call this out in the PR; do not ship a backup hole.

Uninstall: drop schema `CASCADE` only when the admin uninstalls the plugin
(destructive; confirm in admin UI copy later if missing). Disable-without-
uninstall leaves data.

## Docs and tests

- `backend.md`: `persistence` export, schema naming, migration filename
  rules, `pluginDb`.
- Tests: apply two files, skip already applied, fail closed on bad SQL,
  reject a plugin that tries to name `public`.
- Greeter: optional one-row `greetings` table is enough as a fixture; do
  not block FTF on a fancy greeter schema.

## Out of this PR

Drizzle-kit generate inside plugins (hand-written SQL is enough). Plugin
access to core document/edge tables beyond `public.profiles` lookups.
FTF’s actual `sql/0001_*.sql`.
