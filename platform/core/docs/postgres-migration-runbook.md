# Postgres migration runbook (Arango → Postgres)

One-time offline cutover per OpenPeeps instance, or automatic migration on
startup when Postgres is empty and Arango still holds data.

## Automatic migration (startup)

When the API or worker starts, `@openpeeps/core` will:

1. Apply Drizzle schema migrations to Postgres.
2. If Postgres has no application data yet, probe Arango at `DB_URL` / `DB_NAME`.
3. If Arango has documents in `accounts`, `profiles`, or `posts`, export,
   import, and validate in a temporary directory.

Set `AUTO_MIGRATE_FROM_ARANGO=false` to disable. For production cutovers with
both databases running, stop other writers first or use the manual steps below.

## Manual cutover

Run from `platform/core` after building `@openpeeps/core`.

## Prerequisites

- ArangoDB still holds production data (`DB_URL`, `DB_NAME`).
- Empty Postgres database with schema applied (`DATABASE_URL`).
- Application and worker processes **stopped** for the cutover window.
- Sufficient disk space for `./arango-export` (or `MIGRATION_EXPORT_DIR`).

## Environment

| Variable               | Used by          | Purpose                                             |
| ---------------------- | ---------------- | --------------------------------------------------- |
| `DB_URL`               | export           | Arango server URL (default `http://localhost:8529`) |
| `DB_NAME`              | export           | Arango database name                                |
| `DATABASE_URL`         | import, validate | Postgres connection string                          |
| `MIGRATION_EXPORT_DIR` | all              | Export directory (default `./arango-export`)        |
| `AUTO_MIGRATE_FROM_ARANGO` | startup      | Set to `false` to disable automatic migration       |

## Steps

### 1. Stop the application

Stop the API server, BullMQ worker, and any cron jobs that write to the database.
Confirm no clients are mutating Arango during export.

### 2. Export Arango

```bash
cd platform/core
pnpm db:export-arango
```

Writes:

- `collections/<name>.jsonl` — one JSON document per line per collection
- `manifest.json` — row counts and checksums (account emails, post ids)
- `collectionInfos.json` — schema metadata snapshot

Review `manifest.json` counts before proceeding.

### 3. Import into Postgres

Point `DATABASE_URL` at the **target** Postgres instance (not Arango). The import
truncates all migration tables and reloads in FK-safe order (documents, then
edges).

```bash
pnpm db:import-pg
```

Drizzle SQL migrations run automatically before import.

### 4. Validate

```bash
pnpm db:validate-migration
```

Exits non-zero if any collection count or checksum differs from the export
manifest. Re-run import after fixing data issues; do not switch traffic until
validation passes.

### 5. Switch `DATABASE_URL`

Update deployment configuration so the API and worker use Postgres
(`DATABASE_URL`). Remove or archive Arango connection settings once the cutover
is confirmed.

Start the application and smoke-test: login, feed, post creation, notifications.

### 6. Rollback window

Keep the Arango export directory and a Postgres snapshot (`pg_dump`) for at
least **7 days** after cutover.

**Rollback to Arango:** stop app, restore `DATABASE_URL` to unused/disabled,
point app back at Arango (pre-cutover deployment), restart from the Arango
backup if writes occurred after export.

**Rollback within Postgres:** restore from the pre-cutover `pg_dump` and
re-run validate against the original export manifest.

## Commands reference

```bash
pnpm db:export-arango      # node dist/db/migration/cli.js export
pnpm db:import-pg          # node dist/db/migration/cli.js import
pnpm db:validate-migration # node dist/db/migration/cli.js validate
```

Build is run automatically by these scripts. For manual invocation:

```bash
pnpm build
node dist/db/migration/cli.js export|import|validate
```

## Notes

- Historical Arango data migrations under `db/dataMigrations/` are **not**
  replayed on Postgres; the export reflects the final Arango document shapes.
- Redis is unchanged; no migration step required.
- After cutover, backups use `pg_dump` / `pg_restore` instead of collection zip
  export.
