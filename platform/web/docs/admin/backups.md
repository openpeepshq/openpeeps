# Backups

OpenPeeps backups are ZIP archives that capture the community database,
uploaded media, and server logs. Use them to migrate instances or recover from
mistakes.

<div style="height:20px"></div>

## Admin UI

Owners and moderators with the appropriate capabilities can manage backups at
**Administration → Backups** (`/admin/backups`).

| Action   | Capability               |
| -------- | ------------------------ |
| List     | `core-backups-read`      |
| Create   | `core-backups-create`    |
| Download | `core-backups-download`  |
| Restore  | `core-backups-restore`   |

**Create backup** builds a new archive on the server. **Restore** replaces the
current database, media files, and logs with the contents of an uploaded archive.
Restore is destructive: take a fresh backup first if you might need to roll back.

Completed archives are downloaded from `/backups/{name}.zip` (authenticated).

<div style="height:20px"></div>

## Command line

On the server host you can also use the OpenPeeps CLI:

```bash
opc backups create
opc backups list
opc backups restore <backup-name>
```

`restore` expects the backup directory name (without `.zip`), matching the
names shown by `list`.

<div style="height:20px"></div>

## Archive layout

Each backup is a ZIP file with this structure:

```
{name}-backup-{timestamp}-/
├── metadata.json
├── meta/
│   └── collectionInfos.json
├── collections/
│   ├── accounts.jsonl
│   ├── profiles.jsonl
│   ├── posts.jsonl
│   ├── follows.jsonl
│   └── … (one file per collection / edge table)
├── media/
│   └── … (uploaded files)
└── logs/
    └── … (server log files)
```

There is **no** `pg_dump` / `database.dump` file. Database content is stored as
newline-delimited JSON (JSONL), one file per collection or table.

<div style="height:20px"></div>

## metadata.json

`metadata.json` describes the backup, the hostname it was taken from, and the
Postgres schema version at export time.

```json
{
  "databaseType": "postgres",
  "createdAt": "2026-08-23T12:00:00.000Z",
  "schemaVersion": "0007_shallow_oracle",
  "config": {
    "hostname": "community.example.com"
  }
}
```

| Field                    | Description                                                                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `databaseType`           | Always `"postgres"`. Archives without this field are rejected.                                                                              |
| `createdAt`              | ISO-8601 timestamp when the archive was created.                                                                                            |
| `schemaVersion`          | Drizzle migration journal tag the database was on when the backup was created (Postgres backups only).                                      |
| `config.hostname`        | Public hostname of the community when the backup was created. On restore, absolute URLs in stored data are rewritten from this host to the current server host. |

<div style="height:20px"></div>

## collections/*.jsonl

Each file in `collections/` holds one JSON object per line (JSONL). The file
name (without `.jsonl`) is the collection name, for example `accounts.jsonl`,
`follows.jsonl`, `postSeen.jsonl`.

Each line is a Postgres table row as JSON (column names match the Drizzle
schema: `id`, `body`, `fromId`, `toId`, `createdAt`, and so on). Empty tables
are omitted (no file).

<div style="height:20px"></div>

## meta/collectionInfos.json

A snapshot of the server's collection registry at backup time (document vs edge
collections, names). Restore uses the current server's registry for import
order and schema; this file is kept for compatibility with older backup tooling
and inspection.

<div style="height:20px"></div>

## media/ and logs/

- **media/** — contents of the configured media storage directory (local disk
  or equivalent path on the server).
- **logs/** — local server log files from the configured logs path.

On restore, existing media and logs directories are emptied, then repopulated
from the archive.

<div style="height:20px"></div>

## Restore behaviour (summary)

1. Extract the ZIP to a temporary directory.
2. Validate `metadata.json` and at least one `collections/*.jsonl` file.
3. Replace media and logs on disk.
4. Reset the Postgres schemas and migrate to the restore target schema:
   - with `schemaVersion` → that journal tag.
   - without `schemaVersion` → `0007_shallow_oracle`
     (`meta/0007_snapshot.json`), the last schema before version stamping.
5. Import JSONL files as Postgres rows.
6. Run remaining Drizzle migrations forward to the latest schema shipped with
   the server (SQL data migrations therefore see the restored rows).
7. Rewrite hostnames in stored URLs when `config.hostname` differs from the
   current server.
8. Re-apply default role capabilities.

Restore fails if the archive has no database rows, is missing required paths,
or uses the unsupported legacy `database.dump` (pg_dump) format.

<div style="height:20px"></div>

## Related documentation

- [Data storage](/docs/development/data-storage) — PostgreSQL schema overview
- [Routes](/docs/development/routes) — `/admin/backups` and `/backups/…` URLs
