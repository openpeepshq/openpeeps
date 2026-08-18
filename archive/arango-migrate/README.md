# ARCHIVE — not part of the OpenPeeps runtime

One-time ArangoDB → Postgres cutover CLI. Default Compose and
`.env.dev.example` do not start or connect to Arango.

## When to use

Only if an instance still has production data in Arango and an empty
Postgres database. Live servers no longer auto-migrate on startup
(`AUTO_MIGRATE_FROM_ARANGO` defaults to `false` and is ignored at runtime).

## Setup

```bash
# Optional: Arango for export only
docker compose -f docker-compose.yml -f docker-compose.arango.yml up -d

pnpm --filter @openpeepshq/arango-migrate... build
```

Set `DB_URL`, `DB_NAME`, `DATABASE_URL`, and optionally `MIGRATION_EXPORT_DIR`.

## Commands

```bash
pnpm --filter @openpeepshq/arango-migrate export
pnpm --filter @openpeepshq/arango-migrate import
pnpm --filter @openpeepshq/arango-migrate validate
```

Full steps: `platform/core/docs/postgres-migration-runbook.md`.
